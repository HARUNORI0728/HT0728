"""Render arranged scores with FluidSynth + GeneralUser GS, no paid services.

Requires numpy, a FluidSynth shared library, a SoundFont and ffmpeg with libvorbis.
Paths are explicit CLI arguments; no downloads or system configuration changes.
"""
import argparse
import ctypes as C
import hashlib
import json
import math
import os
from pathlib import Path
import re
import struct
import subprocess

import numpy as np

RATE = 44100
PROGRAM = {'piano':0, 'celesta':8, 'glock':9, 'xylo':13, 'organ':19,
           'guitar':24, 'bass':43, 'sub':43, 'violin':40, 'cello':42,
           'pizz':45, 'harp':46, 'timp':47, 'strings':48, 'stacc':48,
           'pad':49, 'brass':61, 'horn':60, 'tuba':58, 'oboe':68,
           'clarinet':71, 'flute':73, 'recorder':74, 'harmonic':48, 'swell':49}
DRUM = {'kick':36, 'snare':38, 'hat':42, 'tick':76, 'shaker':82,
        'taiko':41, 'tamb':54, 'cym':49, 'heart':36}
LEVEL = {'pad':.27, 'strings':.64, 'stacc':.72, 'brass':.62, 'horn':.72,
         'bass':.65, 'sub':.5, 'glock':.42, 'pizz':.85, 'harp':.95,
         'flute':.85, 'recorder':.72, 'cello':.80, 'guitar':.90, 'timp':.65}


def bind(lib, name, result, *args):
    fn = getattr(lib, name)
    fn.restype, fn.argtypes = result, args
    return fn


class Synth:
    def __init__(self, dll, sf):
        self.dll_dir = os.add_dll_directory(str(dll.parent)) if os.name == 'nt' else None
        self.lib = C.CDLL(str(dll))
        ptr, integer, char, real = C.c_void_p, C.c_int, C.c_char_p, C.c_double
        self.new_settings = bind(self.lib, 'new_fluid_settings', ptr)
        self.setnum = bind(self.lib, 'fluid_settings_setnum', integer, ptr, char, real)
        self.setint = bind(self.lib, 'fluid_settings_setint', integer, ptr, char, integer)
        self.settings = self.new_settings()
        for key, val in [('synth.sample-rate',RATE), ('synth.gain',.30),
                         ('synth.reverb.room-size',.52), ('synth.reverb.damp',.5),
                         ('synth.reverb.level',.23), ('synth.reverb.width',70)]:
            if self.setnum(self.settings, key.encode(), val) != 0:
                raise RuntimeError('Invalid FluidSynth setting: '+key)
        for key, val in [('synth.midi-channels',64), ('synth.polyphony',512),
                         ('synth.chorus.active',0), ('synth.reverb.active',1)]:
            self.setint(self.settings, key.encode(), val)
        self.synth = bind(self.lib,'new_fluid_synth',ptr,ptr)(self.settings)
        self.sf = bind(self.lib,'fluid_synth_sfload',integer,ptr,char,integer)(self.synth,str(sf).encode(),0)
        if self.sf < 0:
            raise RuntimeError('SoundFont load failed')
        self.select = bind(self.lib,'fluid_synth_program_select',integer,ptr,integer,integer,integer,integer)
        self.channel_type = bind(self.lib,'fluid_synth_set_channel_type',integer,ptr,integer,integer)
        self.cc = bind(self.lib,'fluid_synth_cc',integer,ptr,integer,integer,integer)
        self.on = bind(self.lib,'fluid_synth_noteon',integer,ptr,integer,integer,integer)
        self.off = bind(self.lib,'fluid_synth_noteoff',integer,ptr,integer,integer)
        self.write = bind(self.lib,'fluid_synth_write_float',integer,ptr,integer,ptr,integer,integer,ptr,integer,integer)

    def read(self, n):
        result = np.empty((n,2),dtype=np.float32)
        if n:
            self.write(self.synth,n,result.ctypes.data,0,2,result.ctypes.data,1,2)
        return result

    def close(self):
        bind(self.lib,'delete_fluid_synth',None,C.c_void_p)(self.synth)
        bind(self.lib,'delete_fluid_settings',None,C.c_void_p)(self.settings)
        if self.dll_dir:
            self.dll_dir.close()


def vlq(n):
    result = [n & 127]
    while n >> 7:
        n >>= 7
        result.insert(0, (n & 127) | 128)
    return bytes(result)


def write_midi(path, parts, duration):
    """Type-1 MIDI, one track per instrument with MIDI-port metadata for >16 channels."""
    tracks=[]
    # 120 BPM, 960 ticks per quarter = 1920 ticks per second.
    for ch, (config, messages) in parts.items():
        name, program, percussion, volume, pan = config
        # Each port has 15 melodic slots and one percussion slot; each percussion track gets its own port.
        port, local = (ch,9) if percussion else (ch//15, (ch%15 if ch%15<9 else ch%15+1))
        stream = bytearray(b'\x00\xff\x21\x01'+bytes([port]))
        label=name.encode('ascii')
        stream += b'\x00\xff\x03'+vlq(len(label))+label
        stream += b'\x00\xff\x51\x03\x07\xa1\x20'
        for payload in [bytes([0xC0|local,program]), bytes([0xB0|local,7,volume]),
                        bytes([0xB0|local,10,pan]), bytes([0xB0|local,91,36])]:
            stream += b'\x00'+payload
        previous=0
        for seconds,on,note,velocity in sorted(messages,key=lambda x:(x[0],x[1])):
            tick=round(seconds*1920)
            stream += vlq(tick-previous)+bytes([(0x90 if on else 0x80)|local,note,velocity if on else 0])
            previous=tick
        stream += vlq(max(0,round(duration*1920)-previous))+b'\xff\x2f\x00'
        tracks.append(b'MTrk'+struct.pack('>I',len(stream))+stream)
    path.write_bytes(b'MThd'+struct.pack('>IHHH',6,1,len(tracks),960)+b''.join(tracks))


def render(score, dll, sf, midi):
    synth=Synth(dll,sf)
    channels, parts, events = {}, {}, []
    for i,e in enumerate(score['events']):
        inst=e['inst']; percussion=inst in DRUM
        if inst not in PROGRAM and not percussion:
            raise ValueError('Unmapped instrument: '+inst)
        key=(e['k'],inst)
        if key not in channels:
            ch=len(channels)
            if ch>=64: raise ValueError('Too many MIDI channels')
            channels[key]=ch
            tr=score['tracks'][e['k']]
            program=0 if percussion else PROGRAM[inst]
            volume=round(100*min(1.1,tr.get('vol',1))*LEVEL.get(inst,.7))
            if percussion: volume=round(60*min(1,tr.get('vol',1)))
            pan=max(0,min(127,round(64+tr.get('pan',0)*55)))
            synth.channel_type(synth.synth,ch,1 if percussion else 0)
            if synth.select(synth.synth,ch,synth.sf,128 if percussion else 0,program)<0:
                raise RuntimeError(f'Missing preset {inst}')
            for control,value in [(7,volume),(10,pan),(91,round(tr.get('rev',.3)*95)),(11,112)]:
                synth.cc(synth.synth,ch,control,value)
            parts[ch]=((inst,program,percussion,volume,pan),[])
        ch=channels[key]
        note=DRUM[inst] if percussion else int(e['m'])
        # Deterministic small performance variation; no random or external generation.
        velocity=max(25,min(110,round(88*e['v'] + 2*math.sin(i*2.399))))
        start=e['t']; stop=min(score['duration'],start+e['d'])
        parts[ch][1].extend([(start,1,note,velocity),(stop,0,note,0)])
        for cycle in range(3 if score['loop'] else 1):
            offset=cycle*score['duration']
            events.extend([(round((start+offset)*RATE),1,ch,note,velocity),
                           (round((stop+offset)*RATE),0,ch,note,0)])
    write_midi(midi,parts,score['duration'])
    length=round(score['duration']*RATE)
    # Two complete passes plus the first 100 ms of the third pass permit seam validation.
    total=2*length+4410 if score['loop'] else length
    output=np.zeros((total,2),dtype=np.float32)
    cursor=0
    try:
        for at,on,ch,note,velocity in sorted(events):
            if at>=total: break
            if at>cursor:
                output[cursor:at]=synth.read(at-cursor); cursor=at
            if on: synth.on(synth.synth,ch,note,velocity)
            else: synth.off(synth.synth,ch,note)
        output[cursor:]=synth.read(total-cursor)
    finally:
        synth.close()
    if score['loop']:
        output=output[length:2*length].copy()
        # A 1 ms endpoint correction removes any residual sample phase/DC mismatch.
        # No musical fade-out; previous-pass note releases and reverb are retained at the start.
        n=44; delta=output[0]-output[-1]
        output[-n:]+=np.linspace(0,1,n,dtype=np.float32)[:,None]*delta
    else:
        # Jingles have a real held cadence and release; the last 100 ms only clears residual reverb.
        n=4410; output[-n:]*=np.linspace(1,0,n,dtype=np.float32)[:,None]
    return output


def ff(args, extra, data=None):
    r=subprocess.run([str(args.ffmpeg),'-hide_banner','-nostdin',*extra],input=data,capture_output=True)
    if r.returncode: raise RuntimeError(r.stderr.decode(errors='replace')[-4000:])
    return r


def loudness(args, pcm):
    r=ff(args,['-f','f32le','-ar',str(RATE),'-ac','2','-i','pipe:0',
               '-af','loudnorm=I=-20:TP=-1.5:LRA=11:print_format=json','-f','null','-'],pcm.tobytes())
    match=re.findall(r'\{[^{}]*"input_i"[^{}]*\}',r.stderr.decode(errors='replace'))
    if not match: raise RuntimeError('Missing loudness measurement')
    return json.loads(match[-1])


def main():
    p=argparse.ArgumentParser()
    for name in ['scores','soundfont','library','ffmpeg','output','sources','qa']:
        p.add_argument('--'+name,type=Path,required=True)
    p.add_argument('--names',nargs='+',default=['title','camp','map_dawn','map_enemy','boss','crisis','sad','daily','victory','defeat'])
    args=p.parse_args()
    for path in [args.output,args.sources,args.qa]: path.mkdir(parents=True,exist_ok=True)
    for name in args.names:
        score=json.loads((args.scores/(name+'.json')).read_text())
        pcm=render(score,args.library.resolve(),args.soundfont.resolve(),args.sources/(name+'.mid'))
        initial=loudness(args,pcm)
        gain_db=min(-20-float(initial['input_i']),-1.7-float(initial['input_tp']))
        pcm *= 10**(gain_db/20)
        path=args.output/(name+'.ogg')
        loop_tags = ['-metadata','LOOPSTART=0','-metadata','LOOPEND='+str(len(pcm))] if score['loop'] else []
        ff(args,['-y','-f','f32le','-ar',str(RATE),'-ac','2','-i','pipe:0','-c:a','libvorbis','-q:a','6',
                 '-metadata','title='+name,'-metadata','album=Fittoa Reclamation - SoundFont arrangements',
                 *loop_tags,str(path)],pcm.tobytes())
        decoded=ff(args,['-i',str(path),'-f','f32le','-ar',str(RATE),'-ac','2','pipe:1']).stdout
        samples=np.frombuffer(decoded,dtype='<f4').reshape(-1,2)
        measured=loudness(args,samples)
        report={'name':name,'duration':len(samples)/RATE,'frames':len(samples),'channels':2,'sample_rate':RATE,
                'loop':score['loop'],'bpm':score['bpm'],'lufs':float(measured['input_i']),
                'true_peak_dbtp':float(measured['input_tp']),'gain_db':gain_db,
                'peak':float(np.max(np.abs(samples))),
                'boundary_delta':float(np.max(np.abs(samples[0]-samples[-1]))),
                'stereo_difference_rms':float(np.sqrt(np.mean((samples[:,0]-samples[:,1])**2))),
                'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
                'soundfont_sha256':hashlib.sha256(args.soundfont.read_bytes()).hexdigest()}
        assert abs(report['duration']-score['duration']) < .01, report
        assert report['peak'] < 1, report
        assert -22 <= report['lufs'] <= -18, report
        assert report['stereo_difference_rms']>.0001, report
        assert np.isfinite(samples).all(), report
        if score['loop']: assert report['boundary_delta']<.035, report
        else: assert float(np.max(np.abs(samples[-441:])))<.01, report
        (args.qa/(name+'.json')).write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps(report),flush=True)


if __name__=='__main__':
    main()
