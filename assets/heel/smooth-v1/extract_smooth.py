"""Use bundled connected-component extraction for dense custom 16-frame rows."""
import importlib.util,json,sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parent
SKILL=Path('/Users/jasonpoindexter/.codex/plugins/cache/openai-curated-remote/work-pets/0.1.6/skills/create-pet/scripts/extract_strip_frames.py')
spec=importlib.util.spec_from_file_location('pet_extract',SKILL);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
def main(state):
    source=ROOT/'decoded'/f'{state}.png'
    image=module.remove_chroma_background(Image.open(source),(255,0,255),96)
    components=module.connected_components(image)
    largest=max(c['area'] for c in components)
    bodies=[c for c in components if c['area']>=largest*.3]
    if len(bodies)!=16:raise SystemExit(f'{state}: expected16 full-body components, found{len(bodies)}')
    centers=[(c['bbox'][1]+c['bbox'][3])/2 for c in bodies]
    heights=[c['bbox'][3]-c['bbox'][1] for c in bodies]
    if max(centers)-min(centers)>max(heights)*.7:raise SystemExit('Source must be one horizontal row, not a multi-row grid')
    module.ROW_FRAME_COUNTS[state]=16
    folder=ROOT/'frames';folder.mkdir(exist_ok=True)
    result=module.extract_state(source,state,folder,(255,0,255),96,'components')
    frames=[Image.open(p).convert('RGBA') for p in result['frames']]
    errors=[];measurements=[]
    for i,frame in enumerate(frames):
        bbox=frame.getchannel('A').point(lambda p:255 if p>16 else 0).getbbox()
        if bbox is None:errors.append(f'blank frame{i}')
        elif bbox[0]<3 or bbox[1]<3 or bbox[2]>189 or bbox[3]>205:errors.append(f'edge clipping frame{i}: {bbox}')
        measurements.append({'frame':i,'bbox':bbox})
    # Pixel distances record actual change, not an assumption from frame count.
    import PIL.ImageChops
    deltas=[]
    for i in range(16):
        a=frames[i].convert('RGB');b=frames[(i+1)%16].convert('RGB')
        d=PIL.ImageChops.difference(a,b).convert('L')
        deltas.append(sum(p>12 for p in d.getdata()))
    if not any(deltas):errors.append('inert animation')
    report={'ok':not errors,'source':str(source),'frames':16,'extraction':'bundled connected components with shared row scale','errors':errors,'geometry':measurements,'adjacentChangedPixels':deltas,'seamChangedPixels':deltas[-1],'visualPlaybackRequired':True}
    (ROOT/'qa'/f'{state}.json').write_text(json.dumps(report,indent=2)+'\n')
    canvas=Image.new('RGB',(16*192,208),'#f3f0e9')
    for i,frame in enumerate(frames):canvas.paste(frame,(i*192,0),frame)
    canvas.save(ROOT/'qa'/f'{state}-contact.png')
    print(json.dumps({k:v for k,v in report.items() if k not in ['geometry']},indent=2))
    if errors:raise SystemExit(1)
if __name__=='__main__':main(sys.argv[1])
