"""Build the denser Heel export from generated pixels and explicit frame timings."""
from pathlib import Path
import json,subprocess,shutil,zipfile,hashlib
from PIL import Image,ImageDraw,ImageChops
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'final'
PREVIOUS=ROOT.parent/'animation-v1/final'
SKILL=Path('/Users/jasonpoindexter/.codex/plugins/cache/openai-curated-remote/work-pets/0.1.6/skills/create-pet/scripts')
STATES=[('idle','idle-flat'),('listening','waiting-flat'),('focus','running-flat'),('nudge','waving-flat'),('done','done'),('rest','rest')]
TIMES={
 'idle':[1200]+[140]*5+[70]*5+[140]*4+[1200],
 'listening':[800]+[90]*14+[800],
 'focus':[1000]+[140]*14+[1000],
 'nudge':[1100]+[70]*14+[1100],
 'done':[90]*16,
 'rest':[250]*16}
def bounds(image):return image.getchannel('A').point(lambda p:255 if p>16 else 0).getbbox()
def normalize(frames,state):
    boxes=[bounds(im) for im in frames]
    top=min(b[1] for b in boxes);floor=max(b[3] for b in boxes)
    # Preserve one shared transform for the whole row, never scale each pose.
    target=166 if state not in ['focus','rest'] else 105
    scale=min(target/(floor-top),182/max(b[2]-b[0] for b in boxes))
    output=[];offsets=[]
    for image in frames:
        resized=image.resize((round(192*scale),round(208*scale)),Image.Resampling.LANCZOS)
        x=round(96-96*scale);y=round(203-floor*scale)
        # Register the torso, rather than letting tail width shift a seated body.
        if state in ['idle','listening','nudge','done']:
            box=bounds(resized);pixels=resized.load();white=[]
            for py in range(round(box[1]+(box[3]-box[1])*.5),round(box[1]+(box[3]-box[1])*.85)):
                for px in range(box[0],box[2]):
                    rr,gg,bb,aa=pixels[px,py]
                    if aa>128 and min(rr,gg,bb)>150 and max(rr,gg,bb)-min(rr,gg,bb)<50:white.append(px)
            if len(white)>20:x=96-sorted(white)[len(white)//2]
        canvas=Image.new('RGBA',(192,208));canvas.alpha_composite(resized,(x,y));output.append(canvas);offsets.append([x,y])
    return output,{'sharedScale':scale,'sourceFloor':floor,'targetFloor':203,'sourceBoxes':boxes,'frameTranslations':offsets,'anchor':'white chest patch for seated rows; uniform row scale and floor'}
def gif(frames,times,path,name):
    images=[]
    for i,frame in enumerate(frames):
        bg=Image.new('RGB',(384,256),'#f3f0e9');bg.paste(frame,(96,12),frame);ImageDraw.Draw(bg).text((12,238),f'{name} | frame {i+1}/16',fill='#292e30');images.append(bg)
    images[0].save(path,save_all=True,append_images=images[1:],duration=times,loop=0,disposal=2,optimize=False)
    return images
def main():
    OUT.mkdir(exist_ok=True);(OUT/'previews').mkdir(exist_ok=True);(OUT/'strips').mkdir(exist_ok=True)
    atlas=Image.new('RGBA',(3072,1248));registration={};metadata=[]
    for row,(name,source) in enumerate(STATES):
        files=sorted((ROOT/'frames'/source).glob('*.png'))
        if len(files)!=16:raise SystemExit(f'{source}: expected16 frames, found{len(files)}')
        frames=[Image.open(p).convert('RGBA') for p in files]
        frames,registration[name]=normalize(frames,name)
        for col,im in enumerate(frames):atlas.alpha_composite(im,(col*192,row*208))
        metadata.append({'name':name,'row':row,'frames':16,'durationsMs':TIMES[name]})
    (ROOT/'qa/body-registration.json').write_text(json.dumps(registration,indent=2)+'\n')
    atlas.save(OUT/'heel-smooth-raw.png')
    subprocess.run(['python3',str(SKILL/'despill_chroma_edges.py'),str(OUT/'heel-smooth-raw.png'),'--output',str(OUT/'heel-smooth.png'),'--webp-output',str(OUT/'heel-smooth.webp'),'--chroma-key','#FF00FF','--json-out',str(ROOT/'qa/chroma-despill.json')],check=True)
    atlas=Image.open(OUT/'heel-smooth.png').convert('RGBA')
    contact=Image.new('RGB',(3072,6*236),'#f3f0e9');all_frames=[];all_times=[];checks=[]
    for row,entry in enumerate(metadata):
        frames=[atlas.crop((col*192,row*208,(col+1)*192,(row+1)*208)) for col in range(16)]
        target=OUT/'frames'/entry['name'];target.mkdir(parents=True,exist_ok=True)
        for col,frame in enumerate(frames):
            frame.save(target/f'{col:02}.png');contact.paste(frame,(col*192,row*236+24),frame)
        ImageDraw.Draw(contact).text((12,row*236+6),entry['name'],fill='#292e30')
        atlas.crop((0,row*208,3072,(row+1)*208)).save(OUT/'strips'/f"{entry['name']}.png")
        images=gif(frames,entry['durationsMs'],OUT/'previews'/f"{entry['name']}.gif",entry['name'])
        all_frames+=images;all_times+=entry['durationsMs']
        signatures=[hashlib.sha256(f.tobytes()).hexdigest() for f in frames]
        for i,frame in enumerate(frames):
            box=bounds(frame)
            if not box or box[0]<2 or box[1]<2 or box[2]>190 or box[3]>206:raise SystemExit(f"{entry['name']} frame{i} clipped/blank: {box}")
        checks.append({'state':entry['name'],'frames':16,'uniqueEncodedFrames':len(set(signatures)),'boxes':[bounds(im) for im in frames]})
    contact.save(OUT/'contact-sheet.png')
    all_frames[0].save(OUT/'previews/all-states.gif',save_all=True,append_images=all_frames[1:],duration=all_times,loop=0,optimize=False)
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(OUT/'previews/all-states.gif'),'-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'previews/all-states.mp4')],check=True)
    (OUT/'heel-animations.json').write_text(json.dumps({'format':'Heel custom dense v1','image':'heel-smooth.png','width':3072,'height':1248,'columns':16,'cellWidth':192,'cellHeight':208,'rows':metadata,'reducedMotion':'First frame only; Off uses rest.'},indent=2)+'\n')
    # Preserve full Dot compatibility separately; custom geometry must not be uploaded as a Dot.
    compat=OUT/'compatible-dot';compat.mkdir(exist_ok=True)
    for name in ['spritesheet-extended.png','spritesheet-extended.webp','dot-animations.json','validation-extended.json','directions.png']:shutil.copy2(PREVIOUS/name,compat/name)
    report={'ok':True,'width':3072,'height':1248,'frames':96,'cellWidth':192,'cellHeight':208,'rows':checks,'limits':'Geometry/count checks do not establish perceived smoothness. Parent native-size playback review is required.'}
    (ROOT/'qa/structural-validation.json').write_text(json.dumps(report,indent=2)+'\n')
    # Inline manifests allow the delivered player to open offline via file://.
    preview=OUT/'preview.html'
    if preview.exists():
        text=preview.read_text()
        marker='<script id="greg-manifests">'
        if marker in text:
            start=text.index(marker);end=text.index('</script>',start)+9;text=text[:start]+text[end:]
        payload={'heel':json.loads((OUT/'heel-animations.json').read_text()),'dot':json.loads((OUT/'dot-animations.json').read_text())}
        text=text.replace('<script>',marker+'window.GREG_MANIFESTS='+json.dumps(payload)+';</script><script>',1)
        text=text.replace('manifests=Object.fromEntries(', 'manifests=window.GREG_MANIFESTS || Object.fromEntries(')
        preview.write_text(text)
    print(json.dumps({'ok':True,'frames':96,'output':str(OUT)},indent=2))
if __name__=='__main__':main()
