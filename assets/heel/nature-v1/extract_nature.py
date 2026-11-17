"""Extract custom extra clips with the bundled component pipeline; no drawn/warped pixels."""
from pathlib import Path
import importlib.util,json,sys,hashlib
from PIL import Image,ImageChops
ROOT=Path(__file__).resolve().parent
SCRIPT=Path('/Users/jasonpoindexter/.codex/plugins/cache/openai-curated-remote/work-pets/0.1.6/skills/create-pet/scripts/extract_strip_frames.py')
spec=importlib.util.spec_from_file_location('pet_extract',SCRIPT);pet=importlib.util.module_from_spec(spec);spec.loader.exec_module(pet)
def run(state):
 src=ROOT/'decoded'/f'{state}.png';im=Image.open(src).convert('RGBA')
 keyed=pet.remove_chroma_background(im,(255,0,255),96)
 components=pet.connected_components(keyed);largest=max(c['area'] for c in components)
 bodies=sorted([c for c in components if c['area']>largest*.25],key=lambda c:c['center_x'])
 count=len(bodies)
 if not 5<=count<=32:raise SystemExit(f'{state}: suspicious body count {count}')
 heights=[c['bbox'][3]-c['bbox'][1] for c in bodies]
 centers=[(c['bbox'][1]+c['bbox'][3])/2 for c in bodies]
 if max(centers)-min(centers)>max(heights)*.85:raise SystemExit(f'{state}: not a single horizontal row')
 # Upscale the entire source uniformly only when tiny source sprites would otherwise remain tiny.
 scale=max(1, min(3, round(190/max(heights))))
 source=src
 if scale>1:
  source=ROOT/'qa'/f'{state}-extraction-source.png';im.resize((im.width*scale,im.height*scale),Image.Resampling.LANCZOS).save(source)
 pet.ROW_FRAME_COUNTS[state]=count
 original_grouping=pet.component_frame_groups
 if state=='poop-gag':
  def prop_aware_groups(strip,n):
   groups=original_grouping(strip,n)
   if groups is None:return None
   seeds=[g[0] for g in groups];props=[c for g in groups for c in g[1:]]
   fixed=[[seed] for seed in seeds]
   # Generated poop is just behind each dog's leftmost silhouette, not at body centre.
   for c in props:
    target=min(range(n),key=lambda i:abs(seeds[i]['bbox'][0]-c['center_x']))
    fixed[target].append(c)
   return fixed
  pet.component_frame_groups=prop_aware_groups
 result=pet.extract_state(source,state,ROOT/'frames',(255,0,255),96,'components')
 pet.component_frame_groups=original_grouping
 frames=[Image.open(p).convert('RGBA') for p in result['frames']]
 errors=[];boxes=[]
 for i,f in enumerate(frames):
  box=f.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox();boxes.append(box)
  if not box or box[0]<2 or box[1]<2 or box[2]>190 or box[3]>206:errors.append(f'blank/clipped frame {i}: {box}')
 contact=Image.new('RGB',(192*count,208),'#f3f0e9')
 for i,f in enumerate(frames):contact.paste(f,(i*192,0),f)
 contact.save(ROOT/'qa'/f'{state}-contact.png')
 hashes=[hashlib.sha256(f.tobytes()).hexdigest() for f in frames]
 deltas=[]
 for i,f in enumerate(frames):
  d=ImageChops.difference(f,frames[(i+1)%count]).convert('RGB').convert('L');deltas.append(sum(x>12 for x in d.getdata()))
 report={'state':state,'source':str(src),'actualFrames':count,'uniqueEncodedFrames':len(set(hashes)),'wholeSourceUpscale':scale,'sourceBodyBoxes':[c['bbox'] for c in bodies],'propGroupingOverride':'nearest dog left silhouette for trailing poop props' if state=='poop-gag' else None,'sourceEdgeWarnings':[i for i,c in enumerate(bodies) if c['bbox'][0]<=1 or c['bbox'][2]>=im.width-1],'bundledExtractor':str(SCRIPT),'method':'components; shared row scale and vertical registration; detached props grouped to nearest body','ok':not errors,'errors':errors,'boxes':boxes,'adjacentChangedPixels':deltas,'seamChangedPixels':deltas[-1],'visualPlaybackRequired':True}
 (ROOT/'qa'/f'{state}-extraction.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps({k:v for k,v in report.items() if k not in ['boxes','adjacentChangedPixels']}))
 if errors:raise SystemExit(1)
if __name__=='__main__':
 for state in sys.argv[1:]:run(state)
