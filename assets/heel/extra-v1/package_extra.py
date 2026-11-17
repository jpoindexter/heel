"""Pack Greg's custom extra behaviours from generated pixels; no fabricated visual frames."""
from pathlib import Path
import json,math,subprocess,hashlib,shutil,time
from PIL import Image,ImageDraw,ImageOps
ROOT=Path(__file__).resolve().parent;OUT=ROOT/'final';SKILL=Path('/Users/jasonpoindexter/.codex/plugins/cache/openai-curated-remote/work-pets/0.1.6/skills/create-pet/scripts')
NAMES=['pacing','ball-play','fetch-offer','play-bow','chew-stick','scratch-ear','yawn','sniff-search','stretch','error-facepalm','poop-gag','pee-gag']
LABELS={'pacing':'Pace back and forth','ball-play':'Play with a ball','fetch-offer':'Offer the ball','play-bow':'Play bow','chew-stick':'Chew a stick','scratch-ear':'Scratch an ear','yawn':'Sleepy yawn','sniff-search':'Sniff around','stretch':'Post-nap stretch','error-facepalm':'Oops, paw over face','poop-gag':'Cheeky poop','pee-gag':'Mark the rock'}
TRIGGERS={'pacing':'Explicit roam command or occasional non-focus idle stroll','ball-play':'Play command or break activity','fetch-offer':'Play/fetch command; invitation to interact','play-bow':'Play invitation or greeting variant','chew-stick':'Optional quiet break behaviour','scratch-ear':'Rare idle variation outside focus','yawn':'Low-energy transition or wind-down','sniff-search':'Optional curiosity/searching transition','stretch':'Wake-up or end-of-focus break','error-facepalm':'Friendly recoverable error; keep actionable error text visible','poop-gag':'Explicit playful error/gag command; never automatically on serious errors','pee-gag':'Explicit playful gag command; never target actual files/windows/content'}
def bbox(im):return im.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox()
def normalized(name,target=None):
 count=json.loads((ROOT/'qa'/f'{name}-extraction.json').read_text())['actualFrames']
 files=[ROOT/'frames'/name/f'{i:02}.png' for i in range(count)]
 if not files:raise SystemExit(f'Missing extracted source {name}')
 ims=[Image.open(p).convert('RGBA') for p in files];boxes=[bbox(im) for im in ims]
 top=min(b[1] for b in boxes);bottom=max(b[3] for b in boxes)
 target=target or (110 if name=='chew-stick' else 166)
 scale=min(target/(bottom-top),182/max(b[2]-b[0] for b in boxes))
 result=[]
 for im in ims:
  resized=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
  canvas=Image.new('RGBA',(192,208));canvas.alpha_composite(resized,(round(96-96*scale),round(201-bottom*scale)));result.append(canvas)
 return result

def clips():
 result=[]
 for name in NAMES:
  if name=='pacing':
   right=normalized('pacing',150);turn=normalized('pacing-turn',150);left=[ImageOps.mirror(f) for f in right]
   frames=right*2+turn+left*2+list(reversed(turn));n=len(right)*2
   xs=[-160+320*i/(n-1) for i in range(n)]+[160]*len(turn)+[160-320*i/(n-1) for i in range(n)]+[-160]*len(turn)
   times=[90]*n+[110]*len(turn)+[90]*n+[110]*len(turn)
   provenance={'generatedDrawings':len(right)+len(turn),'derivedMirrors':len(left),'playbackReuse':'two walking cycles per direction, reversed turn poses for return'}
  else:
   source=normalized(name);frames=source;xs=[0]*len(frames)
   if name=='sniff-search':frames=source+list(reversed(source));xs=[0]*len(frames)
   times=[110]*len(frames)
   if name=='chew-stick':times=[140]*len(frames)
   elif name in ['yawn','stretch','sniff-search']:times=[140]*len(frames)
   times[0]=650;times[-1]=650
   provenance={'generatedDrawings':len(source),'derivedMirrors':0,'playbackReuse':'forward/reverse sniff half-cycle' if name=='sniff-search' else 'none'}
  result.append({'name':name,'frames':frames,'rootX':xs,'times':times,'provenance':provenance})
 return result

def main():
 OUT.mkdir(exist_ok=True);(OUT/'previews').mkdir(exist_ok=True);(OUT/'frames').mkdir(exist_ok=True);(OUT/'strips').mkdir(exist_ok=True)
 data=clips();total=sum(len(c['frames']) for c in data);columns=16;rows=math.ceil(total/columns)
 atlas=Image.new('RGBA',(192*columns,208*rows));cursor=0
 for clip in data:
  clip['indices']=[]
  for f in clip['frames']:
   atlas.alpha_composite(f,(cursor%columns*192,cursor//columns*208));clip['indices'].append(cursor);cursor+=1
 raw=ROOT/'qa/extra-atlas-raw.png';raw.parent.mkdir(exist_ok=True);atlas.save(raw)
 subprocess.run(['python3',str(SKILL/'despill_chroma_edges.py'),str(raw),'--output',str(OUT/'greg-extras.png'),'--webp-output',str(OUT/'greg-extras.webp'),'--chroma-key','#FF00FF','--json-out',str(ROOT/'qa/chroma-despill.json')],check=True,stdout=subprocess.DEVNULL)
 atlas=Image.open(OUT/'greg-extras.png').convert('RGBA');manifest={'format':'Heel custom extra behaviours v1; not standard Dot','image':'greg-extras.png','width':atlas.width,'height':atlas.height,'cellWidth':192,'cellHeight':208,'columns':16,'rootMotionInterpolation':'linear between per-frame translateX anchors; hold during turns','animations':[]};checks=[];contact=Image.new('RGB',(6*320,2*248),'#f3f0e9');all_gif=[];all_times=[]
 for index,clip in enumerate(data):
  name=clip['name'];native=[];entries=[];folder=OUT/'frames'/name
  if folder.exists():
   archive=ROOT/'qa/previous-build-frames'/f'{name}-{time.time_ns()}';archive.parent.mkdir(exist_ok=True);shutil.move(str(folder),str(archive))
  folder.mkdir(exist_ok=True)
  for i,cell in enumerate(clip['indices']):
   x=cell%16*192;y=cell//16*208;f=atlas.crop((x,y,x+192,y+208));native.append(f);f.save(folder/f'{i:03}.png');entries.append({'x':x,'y':y,'durationMs':clip['times'][i],'translateX':round(clip['rootX'][i],2)})
  errors=[]
  for i,f in enumerate(native):
   box=bbox(f)
   if not box or box[0]<2 or box[1]<2 or box[2]>190 or box[3]>206:errors.append({'frame':i,'bbox':box})
  if errors:raise SystemExit(f'{name}: clipping {errors}')
  strip=Image.new('RGBA',(192*len(native),208))
  for i,f in enumerate(native):strip.alpha_composite(f,(i*192,0))
  strip.save(OUT/'strips'/f'{name}.png')
  review=Image.new('RGB',(min(8,len(native))*192,math.ceil(len(native)/8)*232),'#f3f0e9')
  for i,f in enumerate(native):review.paste(f,(i%8*192,i//8*232),f);ImageDraw.Draw(review).text((i%8*192+8,i//8*232+212),f'{name} {i+1}',fill='#252b2b')
  review.save(OUT/'previews'/f'{name}-frames.png')
  preview=[]
  for i,f in enumerate(native):
   bg=Image.new('RGB',(640,256),'#f3f0e9');bg.paste(f,(224+round(clip['rootX'][i]),8),f);ImageDraw.Draw(bg).text((12,236),f'{LABELS[name]} | {i+1}/{len(native)}',fill='#292e30');preview.append(bg)
  preview[0].save(OUT/'previews'/f'{name}.gif',save_all=True,append_images=preview[1:],duration=clip['times'],loop=0,disposal=2,optimize=False)
  all_gif+=preview;all_times+=clip['times']
  # Overview shows a meaningful midpoint, full ordered frames provided separately.
  f=native[len(native)//2];pos=(index%6*320+64,index//6*248+16);contact.paste(f,pos,f);ImageDraw.Draw(contact).text((index%6*320+12,index//6*248+224),LABELS[name],fill='#292e30')
  hashes=[hashlib.sha256(f.tobytes()).hexdigest() for f in native]
  gag=name in ['poop-gag','pee-gag'];loop=name in ['pacing','chew-stick']
  manifest['animations'].append({'name':name,'label':LABELS[name],'loop':loop,'defaultEnabled':False,'explicitPlayOnly':gag,'cooldownMs':300000 if gag else 90000,'trigger':TRIGGERS[name],'returnState':'idle','durationMs':sum(clip['times']),'provenance':clip['provenance'],'frames':entries,'reducedMotion':'show first frame, no root travel','integrationStatus':'not integrated; preview export only'})
  checks.append({'name':name,'timedFrames':len(native),'uniqueEncodedFrames':len(set(hashes)),'provenance':clip['provenance'],'clippingErrors':errors})
 contact.save(OUT/'contact-sheet.png');all_gif[0].save(OUT/'previews/all-extras.gif',save_all=True,append_images=all_gif[1:],duration=all_times,loop=0,disposal=2,optimize=False)
 subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(OUT/'previews/all-extras.gif'),'-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'previews/all-extras.mp4')],check=True)
 (OUT/'animations.json').write_text(json.dumps(manifest,indent=2)+'\n');(ROOT/'qa/structural-validation.json').write_text(json.dumps({'ok':True,'width':atlas.width,'height':atlas.height,'timedCells':total,'clips':checks,'scope':'Custom count/alpha/margin checks only; not Dot preflight and not perceived smoothness proof'},indent=2)+'\n')
 print(json.dumps({'clips':len(data),'timedCells':total,'sheetSize':atlas.size,'counts':[{c['name']:len(c['frames'])} for c in data]},indent=2))
if __name__=='__main__':main()
