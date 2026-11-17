from pathlib import Path
from PIL import Image
import json
r=Path(__file__).resolve().parent
frames=[Image.open(r/'done-raw-half-frames'/'done-half-a'/f'{i:02}.png').convert('RGBA') for i in range(8)]
order=list(range(8))+list(range(7,-1,-1))
source=Image.new('RGBA',(3072,208),'#FF00FF')
for j,i in enumerate(order):source.alpha_composite(frames[i],(j*192,0))
source.convert('RGB').save(r/'decoded'/'done.png')
(r/'qa'/'done-provenance.json').write_text(json.dumps({'generatedUniquePoses':8,'timedFrames':16,'method':'Deliberate forward/reverse playback of one coherent generated tail halfcycle; exact endpoint holds atframes7/8 and15/0.','frameSourceOrder':order,'generatedSource':str(r/'decoded'/'done-half-a.png'),'notUsed':'done-half-b.png and18body sources rejected; no promise of16unique generated poses.','processing':'Bundled connectedcomponent extraction, transparent pixel assembly only; no manual character drawing, raster warps or crossfades.'},indent=2)+'\n')
print(r/'decoded'/'done.png')
