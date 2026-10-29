"""Genera velocidades por calle y contexto urbano desde el extracto OSM local."""
import json, math, shutil, subprocess
from pathlib import Path
import osmium
ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/'.local/osrm'; CONFIG=ROOT/'config/traffic-speeds.json'; IMAGE='ghcr.io/project-osrm/osrm-backend:v5.27.1'
def limit(raw):
 try:return float(raw.removesuffix(' mph'))*(1.609344 if raw.endswith(' mph') else 1)
 except ValueError:return None
def dist(a,b):
 lat=math.radians((a[1]+b[1])/2);return math.hypot((a[0]-b[0])*111320*math.cos(lat),(a[1]-b[1])*111320)
def inside(p,poly):
 x,y=p; hit=False
 for a,b in zip(poly,poly[1:]):
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:hit=not hit
 return hit
class Places(osmium.SimpleHandler):
 def __init__(self):super().__init__();self.items=[]
 def node(self,n):
  if n.location.valid():
   t=n.tags; cat='school' if t.get('amenity') in {'school','kindergarten','college','university'} else 'retail' if t.get('shop')=='mall' else None
   if cat:self.items.append((cat,(n.location.lon,n.location.lat)))
 def way(self,w):
  t=w.tags;cat='school' if t.get('amenity') in {'school','kindergarten','college','university'} else 'retail' if t.get('shop')=='mall' or t.get('landuse')=='retail' else None
  pts=[(n.lon,n.lat) for n in w.nodes if n.location.valid()]
  if cat and pts:self.items.append((cat,(sum(x for x,y in pts)/len(pts),sum(y for x,y in pts)/len(pts))))
class Roads(osmium.SimpleHandler):
 def __init__(self,config,places,streams):
  super().__init__()
  self.c=config['spatial'];self.places=places;self.streams=streams;self.count=0;self.reasons={};self.grid={}
  for cat,point in places:
   key=(round(point[0]*500),round(point[1]*500))
   self.grid.setdefault(key,[]).append((cat,point))
 def way(self,w):
  base=w.tags.get('highway'); pts=list(w.nodes)
  if base not in self.profiles['habitual'] and base not in self.profiles['peak']:return
  if len(pts)<2 or not all(n.location.valid() for n in pts):return
  self.count+=1; coords=[(n.lon,n.lat) for n in pts]; mid=coords[len(coords)//2]
  micro=inside(mid,self.c['microcentro_polygon_lon_lat']); candidates=[]
  for dx in range(-2,3):
   for dy in range(-2,3):candidates.extend(self.grid.get((round(mid[0]*500)+dx,round(mid[1]*500)+dy),[]))
  near={cat for cat,p in candidates if dist(mid,p)<=self.c['institution_radii_m'][cat]}
  peakSchool='school' in near;retail='retail' in near
  self.reasons[str(w.id)]=[x for x,ok in [('Microcentro',micro),('Cercanía a institución educativa',peakSchool),('Cercanía a centro comercial',retail)] if ok]
  for profile,speeds in self.profiles.items():
   speed=speeds.get(base)
   if speed is None:continue
   factors=[]
   if micro:factors.append(self.c['speed_factors']['microcentro'])
   if peakSchool:factors.append(self.c['speed_factors']['school_peak' if profile=='peak' else 'school_habitual'])
   if retail:factors.append(self.c['speed_factors']['retail_peak' if profile=='peak' else 'retail_habitual'])
   value=speed*math.prod(factors)
   for direction,reverse in [('forward',False),('backward',True)]:
    cap=limit(w.tags.get('maxspeed:'+direction,w.tags.get('maxspeed','')))
    final=min(value,cap) if cap and cap>0 else value
    for a,b in zip(pts,pts[1:]):
     x,y=(b.ref,a.ref) if reverse else (a.ref,b.ref);self.streams[profile].write(f'{x},{y},{final:.2f}\n')
def main():
 c=json.loads(CONFIG.read_text());pbf=DATA/'mdp.osm.pbf'
 if not (DATA/'mdp.osrm.mldgr').exists():raise SystemExit('Primero ejecutar osrm-local.sh prepare')
 places=Places();places.apply_file(str(DATA/'buenos-aires.osm.pbf'),locations=True)
 places.items=[(cat,p) for cat,p in places.items if -58.16<=p[0]<=-57.44 and -38.21<=p[1]<=-37.89]
 print(f'Instituciones y áreas comerciales OSM: {len(places.items)}',flush=True)
 streams={};folders={}
 for profile in c['profiles']:
  folder=DATA/profile;folder.mkdir(exist_ok=True);folders[profile]=folder
  for src in DATA.glob('mdp.osrm*'):
   if src.is_file():shutil.copy2(src,folder/src.name)
  streams[profile]=(folder/'speeds.csv').open('w')
 handler=Roads(c,places.items,streams);handler.config=c;handler.profiles=c['profiles'];handler.apply_file(str(pbf),locations=True)
 for stream in streams.values():stream.close()
 for profile,folder in folders.items():
  subprocess.run(['docker','run','--rm','--memory=2g','--cpus=2','-v',f'{folder}:/data',IMAGE,'osrm-customize','-t','2','/data/mdp.osrm','--segment-speed-file','/data/speeds.csv'],check=True)
  (folder/'traffic-manifest.json').write_text(json.dumps({'profile':profile,'config':c,'osm_institutions':len(places.items),'ways_processed':handler.count,'reasons_by_way':handler.reasons,'map_manifest':json.loads((DATA/'data-manifest.json').read_text())},indent=2)+'\n')
 from export_traffic_overlay import export_overlay
 export_overlay()
if __name__=='__main__':main()
