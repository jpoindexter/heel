import importlib.util,json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parent
SKILL=Path('/Users/jasonpoindexter/.codex/plugins/cache/openai-curated-remote/work-pets/0.1.6/skills/create-pet/scripts/extract_strip_frames.py')
spec=importlib.util.spec_from_file_location('pet_extract',SKILL);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
reports=[]
for q in range(4):
 state=f'gait-inbetweens-{q}'; module.ROW_FRAME_COUNTS[state]=3
 source=ROOT/'decoded'/f'{state}.png'
 result=module.extract_state(source,state,ROOT/'quarter-frames',(255,0,255),96,'components')
 frames=[Image.open(p).convert('RGBA') for p in result['frames']]
 contact=Image.new('RGBA',(5*192,208),'#f3f0e9')
 anchorroot=ROOT.parent/'animation-v1'/'frames'/'running-right'
 seq=[Image.open(anchorroot/f'{q:02}.png').convert('RGBA')]+frames+[Image.open(anchorroot/f'{(q+1)%4:02}.png').convert('RGBA')]
 for i,im in enumerate(seq):contact.alpha_composite(im,(i*192,0))
 contact.save(ROOT/'qa'/f'{state}-with-anchors.png')
 reports.append({'quarter':q,'frames':result['frames'],'rawBboxes':[f.getbbox() for f in frames]})
(ROOT/'qa'/'gait-quarters-extraction.json').write_text(json.dumps(reports,indent=2)+'\n')
print(json.dumps(reports,indent=2))
