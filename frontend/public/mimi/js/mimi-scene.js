/* Painted PNG scenery, parallax and image particles. No framework or fetch required. */
(function(){
  'use strict';
  const defaultAssets=new URL('../assets/',document.currentScript.src).href;
  const views={home:'scene/studio-interior.webp',catalog:'rooms/catalog.webp',favorites:'rooms/favorites.webp',gifts:'scene/fair-kiosk.webp',library:'rooms/library.webp',commissions:'rooms/commissions.webp',chat:'rooms/chat.webp'};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  class MimiScene{
    constructor(root,options={}){
      if(!root)throw new TypeError('MimiScene needs a mount element.');
      this.root=root;this.assets=options.assets||defaultAssets;this.paused=!!options.paused;this.auto=false;this.destroyed=false;this.lightning=options.lightning!==false;this.weather='clear';this.wind=.12;
      this.cycleSeconds=Math.max(20,Number(options.cycleSeconds)||150);this.motion={x:0,y:0,scroll:0};this.target={x:0,y:0,scroll:0};this.particles=[];
      this.abort=new AbortController();this.media=matchMedia('(prefers-reduced-motion: reduce)');this.reduced=this.media.matches;
      const img=(path,cls='')=>`<img class="${cls}" src="${this.assets+path}" alt="" draggable="false">`;
      /* MimiMMDart: capas que se descargan solo cuando hacen falta (feria, climas,
         cielo de deseos). Llevan data-src y cargarCapas() les pone el src. */
      const lazy=(path,cls='')=>`<img class="${cls}" data-src="${this.assets+path}" alt="" draggable="false">`;
      root.classList.add('mimi-scene');root.removeAttribute('aria-hidden');
      root.innerHTML=`<div class="mimi-sky mimi-sky--day"></div><div class="mimi-sky mimi-sky--sunset"></div><div class="mimi-sky mimi-sky--night"></div>
        ${img('weather/sun.webp','mimi-orb')}${lazy('weather/moon.webp','mimi-orb mimi-orb--moon')}
        <div class="mimi-cloud-plane mimi-depth">${img('scene/cloud.webp','mimi-cloud mimi-cloud--one')}${img('scene/cloud.webp','mimi-cloud mimi-cloud--two')}${img('scene/cloud.webp','mimi-cloud mimi-cloud--three')}</div>
        <div class="mimi-storm-plane mimi-depth">${lazy('weather/storm-clouds.webp','mimi-storm-cloud')}</div>
        ${lazy('weather/lightning.webp','mimi-lightning')}<div class="mimi-special-sky">${lazy('effects/wish-sky-background.webp')}${lazy('effects/constellation-name.webp','mimi-constellation')}</div><canvas class="mimi-wish-canvas" aria-hidden="true"></canvas>
        <div class="mimi-studio-world"><div class="mimi-city mimi-city--far mimi-depth">${img('scene/city-far.webp')}</div><div class="mimi-city mimi-city--painted mimi-depth">${img('scene/city-panorama.webp')}</div></div>
        <div class="mimi-fair-world"><div class="mimi-ferris mimi-depth"><div class="mimi-wheel-stand">${lazy('rides/wheel-stand.webp')}</div><div class="mimi-wheel-rotor">${lazy('rides/wheel-rotor.webp','mimi-wheel-ring')}${Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return `<div class="mimi-cabin-position" style="left:${50+45*Math.cos(a)}%;top:${50+45*Math.sin(a)}%">${lazy('rides/wheel-cabin.webp','mimi-wheel-cabin')}</div>`;}).join('')}</div></div>
        <div class="mimi-fair-panorama mimi-depth">${lazy('scene/fairground-panorama.webp')}</div>
        <div class="mimi-carousel mimi-depth">${[0,1,2].map(i=>lazy('rides/carousel-horse.webp','mimi-carousel-horse mimi-carousel-horse--'+i)).join('')}</div>
        <div class="mimi-coaster mimi-depth"><div class="mimi-coaster-rail">${[0,1,2].map(i=>'<div class="mimi-coaster-position" data-cart="'+i+'">'+lazy('rides/coaster-single.webp','mimi-coaster-train')+'</div>').join('')}</div>${lazy('rides/coaster-front-occluder.webp','mimi-ride-occluder')}</div></div>
        <canvas class="mimi-weather-canvas"></canvas><div class="mimi-room mimi-depth">${img(views.home,'mimi-room-art')}</div><div class="mimi-booth mimi-depth">${lazy(views.gifts)}</div>
        <div class="mimi-foreground mimi-depth">${img('props/atelier-front.webp','mimi-prop mimi-prop--atelier')}${lazy('props/feria-front.webp','mimi-prop mimi-prop--feria')}</div><div class="mimi-lantern-warmth"></div>`;
      this.room=root.querySelector('.mimi-room-art');this.canvas=root.querySelector('.mimi-weather-canvas');this.context=this.canvas.getContext('2d');this.bolt=root.querySelector('.mimi-lightning');this.trainPlane=root.querySelector('.mimi-coaster');
      this.initPaintedEffects();
      /* MimiMMDart: la lluvia y la nieve se piden en setWeather(), no aquí. */
      this.weatherImages={};
      this.resize=()=>{const r=root.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);const ratio=Math.min(devicePixelRatio||1,1.5);this.canvas.width=Math.round(this.width*ratio);this.canvas.height=Math.round(this.height*ratio);this.context.setTransform(ratio,0,0,ratio,0,0);root.style.setProperty('--rail-sx',this.trainPlane.clientWidth/2048);root.style.setProperty('--rail-sy',this.trainPlane.clientHeight/683);this.seedWeather();this.drawWeather(0);this.resizePaintedEffects(ratio);};
      this.pointer=e=>{if(e.pointerType==='touch'||this.paused||this.reduced)return;const r=root.getBoundingClientRect();this.target.x=((e.clientX-r.left)/r.width-.5)*24;this.target.y=((e.clientY-r.top)/r.height-.5)*12;this.start();};
      this.scroll=()=>{this.target.scroll=Math.min(window.scrollY,1700)*.035;this.start();};
      this.mediaChange=()=>{this.reduced=this.media.matches;if(this.reduced)this.auto=false;this.sync();this.start();};
      document.addEventListener('pointermove',this.pointer,{signal:this.abort.signal,passive:true});window.addEventListener('scroll',this.scroll,{signal:this.abort.signal,passive:true});window.addEventListener('resize',this.resize,{signal:this.abort.signal,passive:true});
      document.addEventListener('visibilitychange',()=>{this.last=0;this.sync();this.start();},{signal:this.abort.signal});this.media.addEventListener('change',this.mediaChange);this.tick=this.tick.bind(this);
      if(window.ResizeObserver){this.resizeObserver=new ResizeObserver(this.resize);this.resizeObserver.observe(root);}
      this.setView(options.view||(options.environment==='fairground'?'gifts':'home'));this.setLighting(options.lighting??.5);this.resize();this.setWeather(options.weather||'clear');if(options.wind!=null)this.setWind(options.wind);this.sync();this.start();
    }
    emit(name,detail){this.root.dispatchEvent(new CustomEvent('mimi:'+name,{bubbles:true,detail}));}
    /* MimiMMDart: pone el src a las imágenes diferidas (data-src) dentro de los
       elementos que casen con el selector. La segunda llamada no hace nada. */
    cargarCapas(selector){for(const el of this.root.querySelectorAll(selector)){const imgs=el.matches('img')?[el]:el.querySelectorAll('img[data-src]');for(const im of imgs){if(im.dataset.src){im.src=im.dataset.src;delete im.dataset.src;}}}}
    cargarClima(){if(this.weatherImages.rain)return;for(const name of ['rain','snow']){const image=new Image();image.onload=()=>{if(!this.destroyed){this.drawWeather(0);this.start();}};image.src=this.assets+'weather/'+name+'.webp';this.weatherImages[name]=image;}this.cargarCapas('.mimi-storm-plane, .mimi-lightning');}
    setView(value){if(!Object.prototype.hasOwnProperty.call(views,value))value='home';this.view=value;this.environment=value==='gifts'?'fairground':'studio';this.root.dataset.view=value;this.root.dataset.environment=this.environment;this.room.src=this.assets+views[value];if(this.environment==='fairground')this.cargarCapas('.mimi-fair-world, .mimi-booth, .mimi-prop--feria');this.root.style.setProperty('--city-shift',{home:0,catalog:-4,favorites:5,library:-7,commissions:3,chat:8,gifts:0}[value]+'%');if(this.resize)this.resize();this.emit('view',{view:value,environment:this.environment});this.start();return value;}
    setEnvironment(value){this.setView(value==='fairground'?'gifts':'home');return this.environment;}
    setLighting(value){const n=Number(value);this.lighting=Number.isFinite(n)?clamp(n,0,1):.5;this.applyLighting(this.wishState?.blend||0);this.emit('lighting',{value:this.lighting});return this.lighting;}
    applyLighting(blend=0){const base=this.lighting??.5,light=base+(.89-base)*blend;if(light*2-1>0)this.cargarCapas('.mimi-orb--moon');this.root.style.setProperty('--day',Math.max(0,1-light*2));this.root.style.setProperty('--sunset',1-Math.abs(light*2-1));this.root.style.setProperty('--night',Math.max(0,light*2-1));this.emit('ambience',{value:light,blend});}
    setAuto(active){this.auto=!!active&&!this.reduced;this.phase=Math.acos(1-2*this.lighting);this.last=0;this.start();return this.auto;}
    setWeather(value){if(!['clear','rain','snow','storm'].includes(value))value='clear';if(value!=='clear')this.cargarClima();this.weather=value;this.root.dataset.weather=value;this.root.style.setProperty('--weather-shade',{clear:0,rain:.09,snow:.03,storm:.18}[value]);this.root.style.setProperty('--storm-opacity',{clear:0,rain:.55,snow:.3,storm:.9}[value]);this.setWind({clear:.12,rain:.45,snow:.2,storm:.8}[value]);this.seedWeather();this.drawWeather(0);this.scheduleLightning();this.emit('weather',{weather:value});this.start();return value;}
    setWind(value){this.wind=clamp(Number(value)||0,0,1);this.root.style.setProperty('--cloud-duration',(130-this.wind*65)+'s');this.emit('wind',{value:this.wind});return this.wind;}
    setLightning(active){this.lightning=!!active;this.scheduleLightning();return this.lightning;}
    seedWeather(){if(!this.width)return;const count={clear:0,rain:85,snow:48,storm:115}[this.weather];this.particles=Array.from({length:count},()=>({x:Math.random()*this.width,y:Math.random()*this.height,scale:.55+Math.random()*.85,phase:Math.random()*Math.PI*2}));}
    drawWeather(dt){const ctx=this.context;if(!ctx)return;ctx.clearRect(0,0,this.width,this.height);if(this.weather==='clear')return;const snow=this.weather==='snow',image=this.weatherImages[snow?'snow':'rain'];if(!image?.complete||!image.naturalWidth)return;this.weatherTime=(this.weatherTime||0)+dt;ctx.globalAlpha=(snow?.75:.53)*(1-(this.wishState?.blend||0));
      for(const p of this.particles){if(dt){p.y+=dt*(snow?22+20*p.scale:370+180*p.scale);p.x+=dt*(snow?this.wind*34+Math.sin(this.weatherTime*.7+p.phase)*8:-35-this.wind*100);if(p.y>this.height+40){p.y=-40;p.x=Math.random()*this.width;}if(p.x<-40)p.x=this.width+30;if(p.x>this.width+40)p.x=-30;}
        const size=(snow?12:40)*p.scale;ctx.drawImage(image,p.x,p.y,snow?size:size*.55,size);}
      ctx.globalAlpha=1;
    }
    scheduleLightning(){clearTimeout(this.lightningTimer);clearTimeout(this.flashTimer);this.root.classList.remove('is-lightning');this.emit('flash',{active:false});if(this.weather!=='storm'||!this.lightning||this.paused||this.reduced||this.destroyed||document.hidden)return;this.lightningTimer=setTimeout(()=>{this.flashLightning();this.lightningTimer=setTimeout(()=>this.scheduleLightning(),1200);},17000+Math.random()*18000);}
    flashLightning(){if(this.weather!=='storm'||!this.lightning||this.paused||this.reduced||document.hidden||this.destroyed||this.wishState?.active)return false;this.bolt.style.left=(25+Math.random()*40)+'%';this.root.classList.add('is-lightning');this.emit('flash',{active:true});clearTimeout(this.flashTimer);this.flashTimer=setTimeout(()=>{this.root.classList.remove('is-lightning');this.emit('flash',{active:false});},650);return true;}
    sync(){this.root.dataset.paused=String(this.paused||document.hidden);this.root.dataset.reduced=String(this.reduced);if(this.paused||this.reduced||document.hidden){cancelAnimationFrame(this.frame);this.frame=0;this.last=0;}if(this.reduced){this.motion={x:0,y:0,scroll:0};this.applyMotion();}this.scheduleLightning();this.emit('motion',{paused:this.paused,reduced:this.reduced});this.renderWish(0);}
    setPaused(active){this.paused=!!active;this.sync();this.start();return this.paused;}
    start(){if(!this.destroyed&&!this.frame&&!this.paused&&!this.reduced&&!document.hidden)this.frame=requestAnimationFrame(this.tick);}
    applyMotion(){this.root.style.setProperty('--px',this.motion.x.toFixed(3));this.root.style.setProperty('--py',this.motion.y.toFixed(3));this.root.style.setProperty('--scroll',this.motion.scroll.toFixed(3));}
    tick(now){this.frame=0;if(this.destroyed||this.paused||this.reduced||document.hidden)return;const elapsed=this.last?Math.max(0,now-this.last):16,dt=Math.min(100,elapsed);this.last=now;const blend=1-Math.exp(-elapsed/150);let moving=false;for(const k of ['x','y','scroll']){this.motion[k]+=(this.target[k]-this.motion[k])*blend;if(Math.abs(this.target[k]-this.motion[k])>.03)moving=true;}this.applyMotion();this.updateCoaster(dt/1000);this.renderWish(elapsed/1000);if(this.auto){this.phase+=elapsed/(this.cycleSeconds*1000)*Math.PI*2;this.setLighting((1-Math.cos(this.phase))/2);}if(this.weather!=='clear'&&(!this.lastWeather||now-this.lastWeather>=32)){this.drawWeather(this.lastWeather?Math.min(.1,(now-this.lastWeather)/1000):.033);this.lastWeather=now;}if(moving||this.auto||this.weather!=='clear'||this.environment==='fairground'||this.wishState.active||this.wishState.stage==='leaving')this.start();else this.last=0;}
    destroy(){this.destroyed=true;cancelAnimationFrame(this.frame);clearTimeout(this.lightningTimer);clearTimeout(this.flashTimer);this.abort.abort();this.resizeObserver?.disconnect();this.media.removeEventListener('change',this.mediaChange);for(const im of Object.values(this.weatherImages))im.onload=null;this.clearStars({immediate:true});if(this.comet)this.comet.onload=null;this.cometFrames?.forEach(im=>im.onload=null);if(this.glint)this.glint.onload=null;this.root.replaceChildren();this.root.classList.remove('mimi-scene','is-lightning');this.root.removeAttribute('style');this.particles=[];for(const k of ['environment','view','weather','paused','reduced'])delete this.root.dataset[k];}
  }
  /* Geometry below is invisible. All visible ride/effect pixels are painted PNGs. */
  MimiScene.coasterRail="M 562 127 C 647 118 768 184 894 326 C 967 409 1033 458 1084 465 C 1110 422 1110 333 1155 311 C 1221 298 1286 399 1358 436 C 1424 455 1497 450 1553 403 C 1646 314 1738 241 1839 223 C 1928 206 1989 220 2059 266";
  MimiScene.prototype.initPaintedEffects=function(){
    this.wishCanvas=this.root.querySelector('.mimi-wish-canvas');this.wishContext=this.wishCanvas.getContext('2d');this.wishState={active:false,age:0,duration:22,stars:[],blend:0,stage:'idle'};this.specialSky=this.root.querySelector('.mimi-special-sky');
    /* MimiMMDart: cometas, destellos y cielo especial se piden en shootStars(), no aquí. */
    this.root.dataset.magic='false';document.addEventListener('mimi:wish',()=>this.shootStars(),{signal:this.abort.signal});
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('mimi-rail-geometry');svg.setAttribute('width','0');svg.setAttribute('height','0');this.railPath=document.createElementNS(svg.namespaceURI,'path');this.railPath.setAttribute('d',MimiScene.coasterRail);svg.append(this.railPath);this.root.append(svg);this.railLength=this.railPath.getTotalLength();this.coasterDistance=this.railLength*.08;this.cars=[...this.root.querySelectorAll('[data-cart]')];this.updateCoaster(0);
  };
  MimiScene.prototype.resizePaintedEffects=function(ratio){
    this.wishCanvas.width=Math.round(this.width*ratio);this.wishCanvas.height=Math.round(this.height*ratio);this.wishContext.setTransform(ratio,0,0,ratio,0,0);this.renderWish(0);
  };
  MimiScene.prototype.setRideProgress=function(value){
    this.coasterDistance=clamp(Number(value)||0,0,1)*this.railLength;this.updateCoaster(0);return this.coasterDistance/this.railLength;
  };
  MimiScene.prototype.updateCoaster=function(dt){
    const L=this.railLength,path=this.railPath,lead=path.getPointAtLength(clamp(this.coasterDistance,0,L)),ahead=path.getPointAtLength(clamp(this.coasterDistance+2,0,L)),slope=Math.atan2(ahead.y-lead.y,ahead.x-lead.x);
    if(dt&&!this.paused&&!this.reduced){this.coasterDistance+=dt*(67+Math.sin(slope)*30);if(this.coasterDistance>L+160)this.coasterDistance=-25;}
    for(const [i,el] of this.cars.entries()){
      const s=this.coasterDistance-i*70;el.hidden=s<0||s>L;const back=path.getPointAtLength(clamp(s-19,0,L)),front=path.getPointAtLength(clamp(s+19,0,L));const x=(back.x+front.x)/2,y=(back.y+front.y)/2,angle=Math.atan2(front.y-back.y,front.x-back.x);
      el.style.transform='translate('+(x-76*.456).toFixed(3)+'px,'+(y-50.667*.966).toFixed(3)+'px) rotate('+angle.toFixed(5)+'rad)';el.dataset.railX=x.toFixed(3);el.dataset.railY=y.toFixed(3);el.dataset.angle=angle.toFixed(5);el.dataset.distance=s.toFixed(3);
    }
  };
  MimiScene.prototype.cargarEfectos=function(){
    if(this.comet)return;this.comet=new Image();this.comet.onload=()=>{if(!this.destroyed)this.renderWish(0);};this.comet.src=this.assets+'effects/rainbow-comet.webp';this.cometFrames=Array.from({length:4},(_,i)=>{const im=new Image();im.onload=()=>{if(!this.destroyed)this.renderWish(0);};im.src=this.assets+'effects/rainbow-frame-'+i+'.webp';return im;});this.glint=new Image();this.glint.src=this.assets+'effects/star-glint.webp';this.cargarCapas('.mimi-special-sky');
  };
  MimiScene.prototype.shootStars=function(options={}){
    if(this.destroyed)return false;this.cargarEfectos();const duration=clamp(Number(options.duration)||22,8,40);this.wishState={active:true,age:0,duration,blend:this.reduced?1:0,stage:'entering',stars:Array.from({length:17},(_,i)=>({delay:1.8+i*.62,speed:.12+Math.random()*.07,y:.015+Math.random()*.31,width:.13+Math.random()*.11,tilt:.06+Math.random()*.25,phase:Math.random()*4}))};
    clearTimeout(this.flashTimer);this.root.classList.remove('is-lightning');this.emit('flash',{active:false});this.root.dataset.magic='true';this.emit('magic',{active:true});this.renderWish(0);this.start();return true;
  };
  MimiScene.prototype.clearStars=function(options={}){
    if(!this.wishState)return;const was=this.wishState.active;this.wishState.active=false;this.wishState.stage=options.immediate||this.reduced?'idle':'leaving';if(this.wishState.stage==='idle'){this.wishState.blend=0;this.wishState.stars=[];this.wishContext?.clearRect(0,0,this.width||1,this.height||1);this.specialSky.style.opacity=0;this.root.style.setProperty('--wish-blend',0);this.applyLighting(0);}this.root.dataset.magic='false';if(was)this.emit('magic',{active:false});this.start();
  };
  MimiScene.prototype.renderWish=function(dt){
    const ctx=this.wishContext,state=this.wishState;if(!ctx||!this.width)return;ctx.clearRect(0,0,this.width,this.height);const live=dt&&!this.paused&&!this.reduced&&!document.hidden;
    if(live){if(state.active){state.age+=dt;state.blend=Math.min(1,state.blend+dt/2.4);if(state.age>state.duration)this.clearStars();}else if(state.stage==='leaving'){state.blend=Math.max(0,state.blend-dt/2.4);if(state.blend===0){state.stage='idle';state.stars=[];}}}
    this.specialSky.style.opacity=state.blend;this.root.style.setProperty('--wish-blend',state.blend.toFixed(4));this.applyLighting(state.blend);if(state.stage==='idle'&&!state.active)return;
    const still=this.reduced;const fade=state.blend*.88,frames=this.cometFrames,ready=frames.every(im=>im.complete&&im.naturalWidth);
    for(const [i,star] of state.stars.entries()){
      let age=state.age-star.delay;if(still)age=(i%5+1)*.8;if(age<0)continue;const w=this.width*star.width,source=ready?frames[0]:this.comet;if(!source.complete||!source.naturalWidth)continue;const h=w*source.height/source.width;
      const x=-w+age*star.speed*this.width,y=star.y*this.height+age*star.speed*this.width*star.tilt;if(x>this.width+w)continue;
      ctx.save();ctx.translate(x,y);ctx.rotate(star.tilt);const f=still?0:(age*6+star.phase)%4,first=Math.floor(f),blend=f-first;ctx.globalAlpha=fade*(ready?1-blend:1);ctx.drawImage(ready?frames[first]:source,0,-h*.5,w,h);if(ready&&blend){ctx.globalAlpha=fade*blend;ctx.drawImage(frames[(first+1)%4],0,-h*.5,w,h);}ctx.restore();
    }
    if(this.glint?.complete&&this.glint.naturalWidth){for(let i=0;i<8;i++){const size=10+(i%3)*4,phase=state.age*(.9+i*.04)+i*1.7;ctx.globalAlpha=state.blend*(still?.55:.12+Math.pow(Math.max(0,Math.sin(phase)),5)*.55);ctx.drawImage(this.glint,this.width*(.21+i*.085),this.height*(.19+(i%3)*.045),size,size);}ctx.globalAlpha=1;}
    this.root.dataset.cometFrame=String(this.reduced?0:Math.floor(state.age*6)%4);
  };
  MimiScene.views=Object.keys(views);MimiScene.weather=['clear','rain','snow','storm'];window.MimiScene=MimiScene;
})();
