"""Pack generated/validated pixels and render previews; never draw or synthesize Greg."""
from pathlib import Path
import json
import subprocess
import zipfile
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
FINAL = ROOT / 'final'
SKILL = Path('/Users/jasonpoindexter/.codex/plugins/cache/openai-curated-remote/work-pets/0.1.6/skills/create-pet/scripts')
CELL = (192, 208)
STATES = ['idle','running-right','running-left','waving','jumping','failed','waiting','running','review']
DURATIONS = [[280,110,110,140,140,320],[120]*7+[220],[120]*7+[220],[140]*3+[280],[140]*4+[280],[140]*7+[240],[150]*5+[260],[120]*5+[220],[150]*5+[280]]
def run(script, *args):
    subprocess.run(['python3', str(SKILL/script), *map(str,args)], check=True)
def cell(sheet, row, col):
    return sheet.crop((col*192,row*208,(col+1)*192,(row+1)*208))
def save_gif(frames, times, path, label=None):
    rendered=[]
    for i,frame in enumerate(frames):
        canvas=Image.new('RGB',(384,256),'#f3f0e9')
        canvas.paste(frame,((384-frame.width)//2,18),frame)
        if label:
            ImageDraw.Draw(canvas).text((12,238),f'{label} | frame {i+1}/{len(frames)}',fill='#292e30')
        rendered.append(canvas)
    rendered[0].save(path,save_all=True,append_images=rendered[1:],duration=times,loop=0,disposal=2,optimize=False)

def main():
    full=Image.open(FINAL/'spritesheet-extended.png').convert('RGBA')
    assert full.size==(1536,2288)
    rows=[]
    export_frames=FINAL/'frames'
    strips=FINAL/'strips'
    preview=FINAL/'previews'
    for p in [export_frames,strips,preview]:p.mkdir(parents=True,exist_ok=True)
    all_frames=[];all_times=[]
    for r,(state,times) in enumerate(zip(STATES,DURATIONS)):
        frames=[cell(full,r,c) for c in range(len(times))]
        target=export_frames/state;target.mkdir(exist_ok=True)
        for c,frame in enumerate(frames):frame.save(target/f'{c:02}.png')
        full.crop((0,r*208,1536,(r+1)*208)).save(strips/f'{state}.png')
        save_gif(frames,times,preview/f'{state}.gif',state)
        rows.append({'name':state,'row':r,'frames':len(times),'durationsMs':times})
        for c,frame in enumerate(frames):
            canvas=Image.new('RGB',(384,256),'#f3f0e9');canvas.paste(frame,(96,18),frame)
            ImageDraw.Draw(canvas).text((12,238),f'{state} | {c+1}/{len(times)}',fill='#292e30')
            all_frames.append(canvas);all_times.append(times[c])
    all_frames[0].save(preview/'all-states.gif',save_all=True,append_images=all_frames[1:],duration=all_times,loop=0,optimize=False)
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(preview/'all-states.gif'),'-pix_fmt','yuv420p','-movflags','+faststart',str(preview/'all-states.mp4')],check=True)
    transition=[cell(full,0,c) for c in range(6)]+[cell(full,4,c) for c in range(5)]+[cell(full,0,c) for c in range(6)]
    save_gif(transition,DURATIONS[0]+DURATIONS[4]+DURATIONS[0],preview/'idle-jump-idle.gif','Idle / hop / idle')
    looks=[cell(full,9+i//8,i%8) for i in range(16)]
    save_gif(looks,[240]*16,preview/'look-loop.gif','Clockwise look directions')
    for row in (9,10):full.crop((0,row*208,1536,(row+1)*208)).save(strips/f'look-row-{row}.png')
    rows.extend([{'name':f'look-row-{r}','row':r,'frames':8,'anglesDegrees':[22.5*(8*(r-9)+c) for c in range(8)]} for r in (9,10)])
    (FINAL/'dot-animations.json').write_text(json.dumps({'image':'spritesheet-extended.png','spriteVersionNumber':2,'width':1536,'height':2288,'cellWidth':192,'cellHeight':208,'columns':8,'rows':rows},indent=2)+'\n')
    # Heel is an additional custom-format export, not a modified Dot schema.
    heel=Image.new('RGBA',(1536,1248))
    mapping=[('idle',0,[1200,120,120,120,180,1400]),('listening',6,[700,200,250,250,200,900]),('focus',7,[1000,300,350,140,250,1200]),('nudge',3,[1500,260,500,350]),('done',None,[350,240,240,240,240,500]),('rest',None,[1000]*6)]
    custom=[]
    for r,(name,source,times) in enumerate(mapping):
        if source is not None:frames=[cell(full,source,c) for c in range(len(times))]
        else:frames=[Image.open(ROOT/f'extras/{name}/frames/idle/{c:02}.png').convert('RGBA') for c in range(6)]
        for c,frame in enumerate(frames):heel.alpha_composite(frame,(c*192,r*208))
        custom.append({'name':name,'row':r,'frames':len(times),'durationsMs':times})
    raw=FINAL/'heel-states-raw.png';heel.save(raw)
    run('despill_chroma_edges.py',raw,'--output',FINAL/'heel-states.png','--chroma-key','#FF00FF','--json-out',ROOT/'qa/heel-chroma-despill.json')
    heel=Image.open(FINAL/'heel-states.png').convert('RGBA')
    for r,entry in enumerate(custom):
        frames=[cell(heel,r,c) for c in range(entry['frames'])]
        folder=export_frames/f"heel-{entry['name']}";folder.mkdir(exist_ok=True)
        for c,frame in enumerate(frames):frame.save(folder/f'{c:02}.png')
        heel.crop((0,r*208,1536,(r+1)*208)).save(strips/f"heel-{entry['name']}.png")
        save_gif(frames,entry['durationsMs'],preview/f"heel-{entry['name']}.gif",entry['name'])
    (FINAL/'heel-animations.json').write_text(json.dumps({'image':'heel-states.png','width':1536,'height':1248,'cellWidth':192,'cellHeight':208,'columns':8,'rows':custom,'reducedMotion':'Show first frame only. Keep rest when Off.'},indent=2)+'\n')
    # Contact sheets are previews only; exported cells retain alpha.
    contact=Image.new('RGB',(8*192,6*236),'#f3f0e9')
    for r,entry in enumerate(custom):
        ImageDraw.Draw(contact).text((10,r*236+6),entry['name'],fill='#292e30')
        for c in range(entry['frames']):
            frame=cell(heel,r,c);contact.paste(frame,(c*192,r*236+24),frame)
    contact.save(FINAL/'heel-contact-sheet.png')
    for index,(row,col) in enumerate([(0,0),(3,2),(4,2),(7,3)]):
        frame=cell(full,row,col);bg=Image.new('RGB',(192,208),'#f3f0e9');bg.paste(frame,(0,0),frame);bg.save(preview/f'proof-{index+1}.png')
    print(json.dumps({'ok':True,'dotFrames':73,'heelFrames':34,'preview':str(preview)},indent=2))

if __name__=='__main__':main()
