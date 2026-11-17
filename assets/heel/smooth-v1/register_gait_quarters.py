from pathlib import Path
from PIL import Image
import json,math
ROOT=Path(__file__).resolve().parent
anchorroot=ROOT.parent/'animation-v1'/'frames'/'running-right'
anchors=[Image.open(anchorroot/f'{i:02}.png').convert('RGBA') for i in range(4)]
def area(im):return sum(x>16 for x in im.getchannel('A').getdata())
def bbox(im):return im.getchannel('A').point(lambda x:255 if x>16 else 0).getbbox()
reports=[];loop=[]
outroot=ROOT/'registered-gait';outroot.mkdir(exist_ok=True)
for q in range(4):
 raws=[Image.open(ROOT/'quarter-frames'/f'gait-inbetweens-{q}'/f'{i:02}.png').convert('RGBA') for i in range(3)]
 a,b=anchors[q],anchors[(q+1)%4];ba,bb=bbox(a),bbox(b)
 target_area=(area(a)+area(b))/2
 scale=math.sqrt(target_area/(sum(area(f) for f in raws)/3))
 # One uniform scale for the complete quarter, bounded to preserve every silhouette.
 targets=[]
 for i,f in enumerate(raws):
  t=(i+1)/4;bf=bbox(f);y=round(ba[1]*(1-t)+bb[1]*t);right=round(ba[2]*(1-t)+bb[2]*t)
  scale=min(scale,(right-5)/(bf[2]-bf[0]),(203-y)/(bf[3]-bf[1]))
  targets.append((y,right))
 loop.append(a.copy());rows=[]
 for i,(f,(y,right)) in enumerate(zip(raws,targets)):
  size=(round(f.width*scale),round(f.height*scale));resized=f.resize(size,Image.Resampling.LANCZOS);bf=bbox(resized)
  dx=right-bf[2];dy=y-bf[1]
  canvas=Image.new('RGBA',(192,208));canvas.alpha_composite(resized,(dx,dy))
  path=outroot/f'{q*4+i+1:02}.png';canvas.save(path);loop.append(canvas)
  rows.append({'frame':q*4+i+1,'scale':scale,'translation':[dx,dy],'bbox':bbox(canvas),'source':str(ROOT/'quarter-frames'/f'gait-inbetweens-{q}'/f'{i:02}.png')})
 reports.append({'quarter':q,'shared_scale':scale,'frames':rows})
for q,a in enumerate(anchors):a.save(outroot/f'{q*4:02}.png')
contact=Image.new('RGBA',(3072,208),'#f3f0e9')
for i,f in enumerate(loop):contact.alpha_composite(f,(i*192,0))
contact.save(ROOT/'qa'/'running-right-quarter-candidate-contact.png')
loop[0].save(ROOT/'qa'/'running-right-quarter-candidate.gif',save_all=True,append_images=loop[1:],duration=65,loop=0,disposal=2)
(ROOT/'qa'/'gait-quarter-registration.json').write_text(json.dumps({'method':'One uniform scale per quarter from shared opaque area, constrained for cell padding, then whole-frame translation matching anchor head-top and nose-right bounds; no raster warps or invented pixels.','quarters':reports},indent=2)+'\n')
print(json.dumps(reports,indent=2))
