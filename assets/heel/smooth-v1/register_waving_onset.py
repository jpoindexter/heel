from pathlib import Path
import json,statistics
from PIL import Image,ImageChops

ROOT=Path(__file__).resolve().parent
old=ROOT/'qa/waving-original-16-frames'
new=ROOT/'qa/onset-frames/waving-onset-inbetweens'
out=ROOT/'frames/waving'
target=Image.open(old/'00.png').convert('RGBA')
tb=target.getchannel('A').point(lambda p:255 if p>16 else 0).getbbox()
fresh=[Image.open(new/f'{i:02d}.png').convert('RGBA') for i in range(4)]
bb=[im.getchannel('A').point(lambda p:255 if p>16 else 0).getbbox() for im in fresh]
# One row-wide uniform transform, anchored on common top/baseline and center.
height=max(b[3] for b in bb)-min(b[1] for b in bb)
scale=(tb[3]-tb[1])/height
cx=statistics.mean((b[0]+b[2])/2 for b in bb)
tcx=(tb[0]+tb[2])/2
bottom=max(b[3] for b in bb)
dx=tcx-scale*cx
dy=tb[3]-scale*bottom
registered=[im.transform((192,208),Image.Transform.AFFINE,(1/scale,0,-dx/scale,0,1/scale,-dy/scale),resample=Image.Resampling.BICUBIC) for im in fresh]
for i in range(16):
    im=registered[i-1] if 1<=i<=4 else Image.open(old/f'{i:02d}.png').convert('RGBA')
    im.save(out/f'{i:02d}.png')
frames=[Image.open(out/f'{i:02d}.png').convert('RGBA') for i in range(16)]
errors=[];geometry=[];deltas=[]
for i,im in enumerate(frames):
    b=im.getchannel('A').point(lambda p:255 if p>16 else 0).getbbox()
    geometry.append({'frame':i,'bbox':b})
    if not b or b[0]<3 or b[1]<3 or b[2]>189 or b[3]>205:errors.append(f'clipping or blank frame {i}: {b}')
    d=ImageChops.difference(im.convert('RGB'),frames[(i+1)%16].convert('RGB')).convert('L')
    deltas.append(sum(v>12 for v in d.getdata()))
contact=Image.new('RGB',(16*192,208),'#f3f0e9')
for i,im in enumerate(frames):contact.paste(im,(i*192,0),im)
contact.save(ROOT/'qa/waving-contact.png')
frames[0].save(ROOT/'qa/waving-review.gif',save_all=True,append_images=frames[1:],duration=95,loop=0,disposal=2)
report={'ok':not errors,'frames':16,'authoring':{'originalSelected':12,'newInbetweens':4,'originalIndices':[0]+list(range(5,16)),'replacementIndices':[1,2,3,4],'originalSource':str(ROOT/'decoded/waving.png'),'inbetweenSource':str(ROOT/'decoded/waving-onset-tone-matched.png'),'originalFramesBackup':str(old)},'registration':{'uniformScale':scale,'dx':dx,'dy':dy,'sharedAcrossAllNewFrames':True},'errors':errors,'geometry':geometry,'adjacentChangedPixels':deltas,'seamChangedPixels':deltas[-1],'visualPlaybackRequired':True,'warnings':['New inbetweens are separately generated and may have texture or outline differences; native playback review required.','Do not rerun extract_smooth.py waving over these assembled frames; it would restore the original source row.']}
(ROOT/'qa/waving-onset-qa.json').write_text(json.dumps(report,indent=2)+'\n')
(ROOT/'qa/waving.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
