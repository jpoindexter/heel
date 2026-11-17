"""Pack generated whole-pose art. No drawing, limb warping or optical flow."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import json, math, hashlib, shutil, zipfile
import numpy as np

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'final';OUT.mkdir(exist_ok=True)
W,H=192,208

def clean_matte(im):
    a=np.array(im.convert('RGBA'));rgb=a[:,:,:3].astype(np.int16);alpha=a[:,:,3]
    near=np.array(Image.fromarray(alpha).filter(ImageFilter.MinFilter(7)))<250
    spill=near & (alpha>0) & (rgb[:,:,0]-rgb[:,:,1]>12) & (rgb[:,:,2]-rgb[:,:,1]>12)
    # Edge-only magenta despill; retain all alpha and interior artwork.
    grey=rgb[:,:,1]
    a[spill,0]=grey[spill];a[spill,2]=grey[spill]
    a[alpha==0]=0
    return Image.fromarray(a),int(spill.sum())

def build():
    jobs=json.loads((ROOT/'jobs.json').read_text());clips={};spill_count=0
    for j in jobs:
        frames=[];hi=[]
        for f in sorted((ROOT/'frames'/j['name']).glob('*.png')):
            im,n=clean_matte(Image.open(f));spill_count+=n;frames.append(im)
            him,_=clean_matte(Image.open(ROOT/'frames-2x'/j['name']/f.name));hi.append(him)
        if len(frames)!=j['frames']:raise ValueError('missing frames '+j['name'])
        report=json.loads((ROOT/'qa'/f"{j['name']}-extraction.json").read_text())
        if not report['ok']:raise ValueError('extraction failed '+j['name'])
        fps=16 if j['frames']>=24 else 12
        if j['name'] in ['idle','focus','rest']:fps=6
        if j['name'] in ['listening','review']:fps=8
        duration=[round(1000/fps)]*len(frames)
        if not j['loop'] and j['name']!='look-directions':duration[0]=220;duration[-1]=500
        if j['name']=='look-directions':duration=[250]*len(frames)
        clips[j['name']]=dict(label=j['label'],loop=j['loop'],frames=frames,hi=hi,durations=duration,rootX=[0]*len(frames),provenance='authored generated sequential poses',source='decoded/'+j['name']+'.png',calibration=report['calibration'])
    right=clips['walk-right'];left={**right,'label':'Walk left','frames':[im.transpose(Image.Transpose.FLIP_LEFT_RIGHT) for im in right['frames']],'hi':[im.transpose(Image.Transpose.FLIP_LEFT_RIGHT) for im in right['hi']],'provenance':'spatial mirror of walk-right; temporal order retained','source':'walk-right'}
    clips['walk-left']=left
    turn=clips['turn-around'];back=[im.transpose(Image.Transpose.FLIP_LEFT_RIGHT) for im in turn['frames']];backhi=[im.transpose(Image.Transpose.FLIP_LEFT_RIGHT) for im in turn['hi']]
    clips['pacing']=dict(label='Pace back and forth',loop=True,frames=right['frames']+turn['frames']+left['frames']+back,hi=right['hi']+turn['hi']+left['hi']+backhi,durations=[70]*24+[80]*24+[70]*24+[80]*24,rootX=[round(-48+96*i/23) for i in range(24)]+[48]*24+[round(48-96*i/23) for i in range(24)]+[-48]*24,provenance='composition: right walk, authored turn, mirrored left walk, mirrored turn; not 96 newly authored poses',source='walk-right + turn-around',calibration='inherits source clip calibration')
    manifest=dict(schema='heel-sprite-atlas-v1',status='beta artwork; native integration unverified',logicalFrame=[W,H],groundY=196,anchor=[96,196],pages=[],animations={},aliases={'running-right':'walk-right','running-left':'walk-left','waving':'wave','jumping':'jump','failed':'error','waiting':'listening','running':'focus','review':'review','sitting':'idle','sleeping':'rest','ball':'ball-play'},notes=['One shared cell geometry and manifest; pages bound texture dimensions.','2x exports are uniformly resampled from generated source resolution; they do not add new drawn detail.','Every clip uses one calibration scale; no per-frame bounding-box fitting.','Generated pose art can retain shape and colour variation; native visual acceptance is still required.','Root offsets are logical pixels external to the source frame. Apply pacing rootX once only; source walks are in place.','Directional looks are discrete targets; do not play as a spinning-body loop.'])
    total=sum(len(c['frames']) for c in clips.values());pagecount=math.ceil(total/256)
    pages=[Image.new('RGBA',(W*16,H*16)) for _ in range(pagecount)];pageshi=[Image.new('RGBA',(W*32,H*32)) for _ in range(pagecount)]
    (OUT/'animations').mkdir(exist_ok=True);(OUT/'frames').mkdir(exist_ok=True);(OUT/'frames-2x').mkdir(exist_ok=True)
    index=0;contact=Image.new('RGB',(6*256,math.ceil(len(clips)/6)*254),'#eeeae3');draw=ImageDraw.Draw(contact)
    for ci,(name,c) in enumerate(clips.items()):
        refs=[];fd=OUT/'frames'/name;fd.mkdir(exist_ok=True);hd=OUT/'frames-2x'/name;hd.mkdir(exist_ok=True)
        for i,(im,hi,dur,rx) in enumerate(zip(c['frames'],c['hi'],c['durations'],c['rootX'])):
            page=index//256;cell=index%256;x=cell%16*W;y=cell//16*H
            pages[page].paste(im,(x,y));pageshi[page].paste(hi,(x*2,y*2));im.save(fd/f'{i:03d}.png');hi.save(hd/f'{i:03d}.png')
            refs.append(dict(page=page,rect=[x,y,W,H],durationMs=dur,rootX=rx));index+=1
        # WebP preserves alpha. GIF is a convenience preview on a warm solid matte.
        c['frames'][0].save(OUT/'animations'/f'{name}.webp',save_all=True,append_images=c['frames'][1:],duration=c['durations'],loop=0 if c['loop'] else 1,lossless=True,quality=100,method=4)
        gif=[]
        for im,rx in zip(c['frames'],c['rootX']):
            bg=Image.new('RGB',(288,H),'#eeeae3');bg.paste(im,(48+rx,0),im);gif.append(bg)
        kwargs=dict(save_all=True,append_images=gif[1:],duration=c['durations'],disposal=2,optimize=False)
        if c['loop']:kwargs['loop']=0
        gif[0].save(OUT/'animations'/f'{name}.gif',**kwargs)
        manifest['animations'][name]=dict(label=c['label'],frameCount=len(refs),loop=c['loop'],durationMs=sum(c['durations']),provenance=c['provenance'],source=c['source'],calibration=c['calibration'],frames=refs)
        cx=ci%6*256;cy=ci//6*254;contact.paste(c['frames'][0],(cx+32,cy),c['frames'][0]);draw.text((cx+8,cy+211),name,fill='#30363a');draw.text((cx+8,cy+229),str(len(refs))+' frames',fill='#555')
    for i,(im,hi) in enumerate(zip(pages,pageshi)):
        # Trim unused atlas rows; every remaining cell still has identical dimensions.
        used=min(256,total-i*256);rows=math.ceil(used/16);im=im.crop((0,0,W*16,H*rows));hi=hi.crop((0,0,W*32,H*rows*2))
        path=OUT/f'greg-puppy-{i+1}.png';im.save(path);hi.save(OUT/f'greg-puppy-{i+1}@2x.png');im.save(OUT/f'greg-puppy-{i+1}.webp',lossless=True,quality=100,method=4)
        manifest['pages'].append(dict(file=path.name,file2x=f'greg-puppy-{i+1}@2x.png',size=list(im.size),size2x=list(hi.size),columns=16,rows=rows,sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    contact.save(OUT/'all-animations.png');(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    # Legacy Dot row layout for Claude's existing uniform-row player.
    dotnames=['idle','walk-right','walk-left','wave','jump','error','listening','focus','review','look-directions'];dot=Image.new('RGBA',(32*W,10*H));dotrows={}
    for row,name in enumerate(dotnames):
        c=clips[name]
        for i,im in enumerate(c['frames']):dot.paste(im,(i*W,row*H))
        dotrows[name]=dict(row=row,frames=len(c['frames']),fps=1000/c['durations'][1],loop=c['loop'])
    dot.save(OUT/'greg-dot-compatible.png');(OUT/'dot-compatible.json').write_text(json.dumps(dict(file='greg-dot-compatible.png',columns=32,rows=10,cellWidth=W,cellHeight=H,actions=dotrows,aliases=manifest['aliases']),indent=2))
    # Structural validation checks actual saved pixels and atlas references.
    checks=[]
    savedpages=[Image.open(OUT/p['file']).convert('RGBA') for p in manifest['pages']]
    for name,a in manifest['animations'].items():
        for i,f in enumerate(a['frames']):
            pg=savedpages[f['page']];x,y,w,h=f['rect'];im=pg.crop((x,y,x+w,y+h));original=Image.open(OUT/'frames'/name/f'{i:03d}.png').convert('RGBA')
            if im.tobytes()!=original.tobytes():raise ValueError('atlas mismatch '+name)
            alpha=im.getchannel('A');edges=[alpha.crop((0,0,W,1)),alpha.crop((0,H-1,W,H)),alpha.crop((0,0,1,H)),alpha.crop((W-1,0,W,H))]
            if any(e.getextrema()[1] for e in edges):raise ValueError('outer alpha '+name+' '+str(i))
        checks.append(dict(name=name,frames=a['frameCount'],uniqueFrames=len(set(hashlib.sha256(im.tobytes()).hexdigest() for im in clips[name]['frames'])),atlasRoundTrip=True,clearOuterBorders=True))
    result=dict(structuralChecksPassed=True,clips=len(clips),timedFrames=total,generatedSourcePoses=sum(j['frames'] for j in jobs),derivedClips=['walk-left','pacing'],edgeDespillPixels=spill_count,checks=checks,visualAcceptance='pending playback review; structural success does not establish smoothness or native integration')
    (OUT/'validation.json').write_text(json.dumps(result,indent=2));print(json.dumps({k:v for k,v in result.items() if k!='checks'}))

if __name__=='__main__':build()
