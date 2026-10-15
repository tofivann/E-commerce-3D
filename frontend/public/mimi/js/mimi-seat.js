/* A scene anchor: Mimi and the room share one fixed coordinate plane. */
(function(){
 'use strict';
 const assets=new URL('../assets/',document.currentScript.src).href;
 const presets={
  home:{anchor:[.78,.855],contact:[700,1090],width:.46,max:610,foreground:'home',caption:'Welcome to my little rooftop studio.'},
  catalog:{anchor:[.81,.98],contact:[600,1430],width:.47,max:600,foreground:null,caption:'A new character, a stage of your own.'},
  favorites:{anchor:[.85,.91],contact:[660,1160],width:.47,max:620,foreground:null,caption:'Let’s find something you’ll love.'},
  gifts:{anchor:[.82,.745],contact:[690,1120],width:.44,max:580,foreground:'gifts',caption:'Welcome to my little feria kiosk!'},
  library:{anchor:[.79,.86],contact:[680,1080],width:.46,max:600,foreground:'library',caption:'Everything you need for your next scene.'},
  commissions:{anchor:[.81,.86],contact:[700,1130],width:.46,max:600,foreground:'commissions',caption:'I’m already thinking about your idea…'},
  chat:{anchor:[.84,.825],contact:[710,1130],width:.45,max:590,foreground:'chat',caption:'A cup of tea, and a little inspiration.'},
  standing:{anchor:[.80,.97],contact:[610,1520],width:.43,max:550,foreground:null,caption:'Hello! Let’s make something wonderful.'}
 };
 class MimiSeat{
  constructor(root,options={}){
   if(!root||!window.MimiCharacter)throw new TypeError('MimiSeat needs a mount element and MimiCharacter.');
   this.root=root;this.assets=options.assets||assets;this.destroyed=false;this.abort=new AbortController();this.scene=options.scene||null;this.followView=options.followView!==false;this.customCaption=options.caption;this.captionEnabled=options.caption!==false;this.anchored=options.anchored!==false&&!!this.scene;this.foregroundOption=options.foreground;this.scale=Math.max(.6,Math.min(1.3,Number(options.scale)||1));this.originalParent=root.parentNode;this.originalNext=root.nextSibling;
   root.classList.add('mimi-seat');root.dataset.anchored=String(this.anchored);root.innerHTML='<div class="mimi-seat__shadow" aria-hidden="true"></div><div class="mimi-seat__character"></div><img class="mimi-seat__foreground" alt="" draggable="false"><div class="mimi-seat__light" aria-hidden="true"></div><p class="mimi-seat__caption"></p>';
   this.foreground=root.querySelector('.mimi-seat__foreground');this.caption=root.querySelector('.mimi-seat__caption');this.caption.hidden=!this.captionEnabled;this.mount=root.querySelector('.mimi-seat__character');this.shadow=root.querySelector('.mimi-seat__shadow');
   this.setLighting(options.lighting??this.scene?.lighting??.5);root.dataset.weather=options.weather||this.scene?.weather||'clear';root.dataset.magic=String(!!this.scene?.wishState?.active);root.dataset.flash='false';root.dataset.paused=String(!!(options.paused??this.scene?.paused));
   this.character=new MimiCharacter(this.mount,{...options,assets:this.assets,pose:options.pose||this.scene?.view||'home',wind:options.wind??this.scene?.wind??.12,paused:options.paused??this.scene?.paused??false,lighting:this.lighting,weather:root.dataset.weather});this.character.root.dataset.magic=root.dataset.magic;
   this.setPose(this.character.pose);const on=(event,callback)=>document.addEventListener('mimi:'+event,callback,{signal:this.abort.signal});
   on('view',e=>{if(this.followView)this.setPose(e.detail.view);});on('lighting',e=>this.setLighting(e.detail.value));on('ambience',e=>this.setLighting(e.detail.value));on('weather',e=>root.dataset.weather=e.detail.weather);on('magic',e=>root.dataset.magic=String(e.detail.active));on('flash',e=>root.dataset.flash=String(e.detail.active));on('motion',e=>root.dataset.paused=String(e.detail.paused));
   this.layout=this.layout.bind(this);window.addEventListener('resize',this.layout,{signal:this.abort.signal});if(window.ResizeObserver){this.observer=new ResizeObserver(this.layout);this.observer.observe(root);}this.layout();
  }
  setPose(name){
   if(this.destroyed)return false;if(!Object.prototype.hasOwnProperty.call(presets,name))name='home';this.pose=name;const p=presets[name];if(this.character.pose!==name)this.character.setPose(name);this.root.dataset.pose=name;
   if(this.anchored){const plane=this.scene.root.querySelector(name==='gifts'?'.mimi-booth':'.mimi-room');if(plane&&this.root.parentNode!==plane)plane.append(this.root);}
   const front=this.foregroundOption===false?null:typeof this.foregroundOption==='string'?this.foregroundOption:p.foreground;this.foreground.hidden=!front;if(front)this.foreground.src=this.assets+'foreground/room-'+front+'.webp';else this.foreground.removeAttribute('src');
   this.root.dataset.foreground=front||'none';this.caption.textContent=typeof this.customCaption==='string'?this.customCaption:p.caption;this.layout?.();return name;
  }
  layout(){if(this.destroyed||!this.pose)return;const p=presets[this.pose],r=this.root.getBoundingClientRect(),mobile=innerWidth<=800;let width;
   if(this.anchored){width=(mobile?Math.min(390,r.width*.72):Math.min(p.max,r.width*p.width))*this.scale;const x=mobile?.66:p.anchor[0],y=p.anchor[1];this.mount.style.width=width+'px';this.mount.style.left=(r.width*x-p.contact[0]*width/1024)+'px';this.mount.style.top=(r.height*y-p.contact[1]*width/1024)+'px';this.shadow.style.left=(r.width*x-width*.35)+'px';this.shadow.style.top=(r.height*y-12)+'px';this.shadow.style.width=width*.7+'px';}
   else{width=Math.min(500,r.width)*this.scale;this.mount.style.width=width+'px';this.mount.style.left=(r.width-width)/2+'px';this.mount.style.top='0px';}
  }
  setScale(value){this.scale=Math.max(.6,Math.min(1.3,Number(value)||1));this.layout();return this.scale;}
  setLighting(value){this.lighting=Math.max(0,Math.min(1,Number(value)||0));this.root.style.setProperty('--seat-night',Math.max(0,this.lighting*2-1));this.character?.setLighting(this.lighting);return this.lighting;}
  setCaption(text){this.customCaption=text;this.captionEnabled=text!==false;this.caption.hidden=!this.captionEnabled;this.caption.textContent=typeof text==='string'?text:presets[this.pose].caption;}
  setExpression(name,options){return this.character.setExpression(name,options);}setEyeTracking(active){return this.character.setEyeTracking(active);}setMotionStrength(value){return this.character.setMotionStrength(value);}setPartMotion(group,value){return this.character.setPartMotion(group,value);}setPaused(active){this.root.dataset.paused=String(!!active);return this.character.setPaused(active);}wish(){return this.character.wish();}
  destroy(){if(this.destroyed)return;this.destroyed=true;this.abort.abort();this.observer?.disconnect();this.character.destroy();this.root.replaceChildren();this.root.classList.remove('mimi-seat');for(const k of ['pose','weather','magic','flash','paused','foreground','anchored'])delete this.root.dataset[k];this.root.style.removeProperty('--seat-night');if(this.originalParent){if(this.originalNext?.parentNode===this.originalParent)this.originalParent.insertBefore(this.root,this.originalNext);else this.originalParent.append(this.root);}}
 }
 MimiSeat.poses=Object.keys(presets);MimiSeat.presets=presets;window.MimiSeat=MimiSeat;
})();
