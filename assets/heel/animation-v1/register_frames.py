"""Apply one shared transform per row to generated pixels, retaining source frames."""
from pathlib import Path
import json, shutil
from PIL import Image
ROOT=Path(__file__).resolve().parent
def register(folder,scale,source_floor):
    backup=folder.parent/(folder.name+'-before-registration')
    if not backup.exists():shutil.copytree(folder,backup)
    # The transform is constant for every frame in a row, never fit per pose.
    records=[]
    for source in sorted(backup.glob('*.png')):
        image=Image.open(source).convert('RGBA')
        resized=image.resize((round(192*scale),round(208*scale)),Image.Resampling.LANCZOS)
        x=round(96-96*scale);y=round(203-source_floor*scale)
        canvas=Image.new('RGBA',(192,208));canvas.alpha_composite(resized,(x,y))
        canvas.save(folder/source.name)
        records.append({'frame':source.name,'before':image.getbbox(),'after':canvas.getbbox()})
    return {'sharedScale':scale,'sourceFloor':source_floor,'targetFloor':203,'frames':records}
if __name__=='__main__':
    result={}
    for state in ['idle','waving','failed','waiting','review']:
        result[state]=register(ROOT/'frames'/state,.84,203)
    result['running']=register(ROOT/'frames/running',.84,165)
    for state in ['running-right','running-left']:
        folder=ROOT/'frames'/state
        bottom=max(Image.open(p).getbbox()[3] for p in folder.glob('*.png'))
        result[state]=register(folder,1.0,bottom)
    result['heel-done']=register(ROOT/'extras/done/frames/idle',.84,203)
    result['heel-rest']=register(ROOT/'extras/rest/frames/idle',.84,170)
    (ROOT/'qa/body-registration.json').write_text(json.dumps(result,indent=2)+'\n')
