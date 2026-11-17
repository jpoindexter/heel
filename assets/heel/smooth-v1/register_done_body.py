from pathlib import Path
from PIL import Image,ImageChops
import json
r=Path(__file__).resolve().parent
backup=r/'done-frames-before-body-registration';backup.mkdir(exist_ok=True)
frames=[];records=[]
for i in range(16):
 path=r/'frames'/'done'/f'{i:02}.png';im=Image.open(path).convert('RGBA');im.save(backup/f'{i:02}.png')
 b=im.crop((0,10,192,60)).getbbox();center=(b[0]+b[2])/2;dx=round(96-center)
 fixed=Image.new('RGBA',im.size);fixed.alpha_composite(im,(dx,0));fixed.save(path);frames.append(fixed)
 records.append({'frame':i,'headBandCenterBefore':center,'translation':[dx,0],'bbox':fixed.getbbox()})
contact=Image.new('RGBA',(3072,208),'#f3f0e9')
for i,f in enumerate(frames):contact.alpha_composite(f,(i*192,0))
contact.save(r/'qa'/'done-contact.png')
frames[0].save(r/'qa'/'done-preview.gif',save_all=True,append_images=frames[1:],duration=70,loop=0,disposal=2)
(r/'qa'/'done-body-registration.json').write_text(json.dumps({'method':'Whole-frame integer horizontal translations of bundled extracted generatedpixels to commonhead-bandcenter96; unchangedsharedscale and baseline.','frames':records},indent=2)+'\n')
report=json.loads((r/'qa'/'done.json').read_text());report['postExtractionRegistration']='done-body-registration.json';report['generatedUniquePoses']=8;report['timedFrames']=16;report['intentionalEndpointHolds']=[[7,8],[15,0]]
report['geometry']=[{'frame':i,'bbox':f.getbbox()} for i,f in enumerate(frames)]
report['adjacentChangedPixels']=[sum(p>12 for p in ImageChops.difference(frames[i].convert('RGB'),frames[(i+1)%16].convert('RGB')).convert('L').getdata()) for i in range(16)];report['seamChangedPixels']=report['adjacentChangedPixels'][-1]
report['errors']=[f'edgeclipping frame{i}: {f.getbbox()}' for i,f in enumerate(frames) if (lambda b:b[0]<3 or b[1]<3 or b[2]>189 or b[3]>205)(f.getbbox())];report['ok']=not report['errors']
(r/'qa'/'done.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'ok':report['ok'],'errors':report['errors'],'translations':[x['translation'][0] for x in records]},indent=2))
