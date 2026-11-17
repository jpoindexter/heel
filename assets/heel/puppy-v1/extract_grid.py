"""Extract complete generated pose groups; never draw or warp a dog.

Uses the existing bundled chroma/component utilities, plus 2D grid registration.
One physical scale per entire clip; row layout offsets never change pose size.
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
import importlib.util, json, sys, statistics, hashlib, math

ROOT=Path(__file__).resolve().parent
HELPER=Path('/Users/jasonpoindexter/.codex/plugins/cache/openai-curated-remote/work-pets/0.1.6/skills/create-pet/scripts/extract_strip_frames.py')
sp=importlib.util.spec_from_file_location('pet_component_tools',HELPER)
pet=importlib.util.module_from_spec(sp);sp.loader.exec_module(pet)

def extract(name):
    plan=next(j for j in json.loads((ROOT/'jobs.json').read_text()) if j['name']==name)
    src=ROOT/'decoded'/f'{name}.png'; raw=Image.open(src).convert('RGBA')
    im=pet.remove_chroma_background(raw,(255,0,255),100)
    cc=pet.connected_components(im); biggest=max(c['area'] for c in cc)
    seeds=[c for c in cc if c['area']>=biggest*.25]
    count=plan['frames']; cols=plan['columns']; rows=plan['rows']
    if len(seeds)!=count:raise ValueError(f'{name}: expected {count} bodies, found {len(seeds)}')
    sw=im.width/cols;sh=im.height/rows
    slots={}
    for c in seeds:
        x=(c['bbox'][0]+c['bbox'][2])/2;y=(c['bbox'][1]+c['bbox'][3])/2
        col=min(cols-1,max(0,int(x/sw)));row=min(rows-1,max(0,int(y/sh)))
        key=row*cols+col
        if key in slots:raise ValueError(f'{name}: two bodies in slot {key}')
        slots[key]=[c]
    if set(slots)!=set(range(count)):raise ValueError(f'{name}: incomplete grid')
    seed_ids={id(c) for c in seeds}
    for c in cc:
        if id(c) in seed_ids or c['area']<max(6,biggest*.0005):continue
        x=(c['bbox'][0]+c['bbox'][2])/2;y=(c['bbox'][1]+c['bbox'][3])/2
        col=min(cols-1,max(0,int(x/sw)));row=min(rows-1,max(0,int(y/sh)))
        slots[row*cols+col].append(c)
    column_anchors=[statistics.median((slots[r*cols+c][0]['bbox'][0]+slots[r*cols+c][0]['bbox'][2])/2 for r in range(rows)) for c in range(cols)]
    calpath=ROOT/'calibration.json';cal=json.loads(calpath.read_text()) if calpath.exists() else {}
    entry=cal.get(name,{})
    # Provisional guide scale until the clip's manual head measurement is recorded.
    scale=entry.get('logicalScale',.5*384/sw)
    footprints=[]
    for row in range(rows):
        bottoms=[slots[row*cols+c][0]['bbox'][3]-row*sh for c in range(cols)]
        footprints.append(statistics.median(bottoms))
    if name=='jump':
        floor=max(slots[0][0]['bbox'][3],slots[count-1][0]['bbox'][3]-(rows-1)*sh)
        footprints=[floor]*rows
    # A single horizontal offset keeps the complete action's envelope centered.
    ext=[]
    for i,g in slots.items():
        b=pet.component_bounds(g); col=i%cols
        ext.append(((b[0]-column_anchors[col])*scale,(b[2]-column_anchors[col])*scale))
    offset=-(min(x[0] for x in ext)+max(x[1] for x in ext))/2
    frame_dir=ROOT/'frames'/name;frame_dir.mkdir(parents=True,exist_ok=True)
    hi_dir=ROOT/'frames-2x'/name;hi_dir.mkdir(parents=True,exist_ok=True)
    for old in list(frame_dir.glob('*.png'))+list(hi_dir.glob('*.png')):
        old.unlink()
    boxes=[];errors=[];hashes=[];frames=[]
    for i in range(count):
        group=slots[i];b=pet.component_bounds(group);col=i%cols;row=i//cols
        cut=pet.component_group_image(im,group,padding=0)
        left=96+(b[0]-column_anchors[col])*scale+offset
        top=196+(b[1]-row*sh-footprints[row])*scale
        hi=Image.new('RGBA',(384,416),(0,0,0,0))
        cut=cut.resize((max(1,round(cut.width*scale*2)),max(1,round(cut.height*scale*2))),Image.Resampling.LANCZOS)
        hi.alpha_composite(cut,(round(left*2),round(top*2)))
        f=hi.resize((192,208),Image.Resampling.LANCZOS)
        box=f.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox();boxes.append(box)
        if not box or box[0]<2 or box[1]<2 or box[2]>190 or box[3]>206:errors.append(f'blank/clipped {i}: {box}')
        f.save(frame_dir/f'{i:03d}.png');hi.save(hi_dir/f'{i:03d}.png')
        hashes.append(hashlib.sha256(f.tobytes()).hexdigest());frames.append(f)
    contact=Image.new('RGB',(192*4,232*math.ceil(count/4)),'#eeeae3');d=ImageDraw.Draw(contact)
    for i,f in enumerate(frames):
        x=i%4*192;y=i//4*232;contact.paste(f,(x,y),f);d.text((x+8,y+210),str(i),fill='#333')
    contact.save(ROOT/'qa'/f'{name}-contact.png')
    deltas=[]
    for a,b in zip(frames,frames[1:]+frames[:1]):
        diff=ImageChops.difference(a,b).convert('RGB').convert('L');deltas.append(sum(p>12 for p in diff.getdata()))
    report=dict(name=name,source=str(src),sourceSize=list(raw.size),actualFrames=count,bodyComponents=len(seeds),uniqueEncodedFrames=len(set(hashes)),logicalFrame=[192,208],density2xAvailable=True,sharedScale=scale,calibration=entry or 'PROVISIONAL guide scale; review required',rowGroundRegistration=footprints,sharedXOffset=offset,sourceBodyBoxes=[slots[i][0]['bbox'] for i in range(count)],boxes=boxes,adjacentChangedPixels=deltas,seamChangedPixels=deltas[-1],ok=not errors,errors=errors,visualPlaybackRequired=True)
    (ROOT/'qa'/f'{name}-extraction.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({k:report[k] for k in ['name','actualFrames','uniqueEncodedFrames','sharedScale','ok','errors']}))
    return report

if __name__=='__main__':
    for name in sys.argv[1:]:extract(name)
