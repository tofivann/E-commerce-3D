/* A continuous raster-textured mesh. Independent spring fields bend the paint;
   shared vertices keep the original ink and skin together at every joint. */
(function(){
 'use strict';
 const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
 function inside(x,y,points){let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
 function distance(x,y,points){let d=Infinity;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));d=Math.min(d,Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy));}return d;}
 const vertex=`attribute vec2 a_position; attribute vec2 a_uv; varying vec2 v_uv;
 void main(){gl_Position=vec4(a_position.x*2.0-1.0,1.0-a_position.y*2.0,0.0,1.0);v_uv=a_uv;}`;
 const fragment=`precision highp float;
 uniform sampler2D u_paint; uniform sampler2D u_heads; uniform vec2 u_size; uniform vec4 u_headRect; uniform vec3 u_headGain;
 uniform vec2 u_gaze; uniform vec4 u_eye0; uniform vec4 u_eye1; uniform vec2 u_tilt;
 uniform float u_expression; uniform float u_blink; uniform float u_excited; uniform float u_mouth; uniform vec4 u_mouthBox;
 varying vec2 v_uv;
 vec2 turn(vec2 p,float a){return vec2(cos(a)*p.x+sin(a)*p.y,-sin(a)*p.x+cos(a)*p.y);}
 vec4 head(vec2 p,float frame){vec2 q=(p-u_headRect.xy)/u_headRect.zw;if(q.x<0.0||q.x>1.0||q.y<0.0||q.y>1.0)return vec4(0.0);vec4 h=texture2D(u_heads,vec2((q.x+frame)/4.0,q.y));h.rgb*=mix(vec3(1.0),u_headGain,smoothstep(.15,.6,max(h.r,max(h.g,h.b))));return h;}
 vec4 paint(vec2 p){vec4 base=texture2D(u_paint,p/u_size);vec4 h=head(p,u_expression);
  float upper=1.0-smoothstep(u_mouthBox.y-65.0,u_mouthBox.y-26.0,p.y);if(u_blink>.001)h=mix(h,head(p,3.0),u_blink*upper);
  float mouthMask=1.0-smoothstep(.68,1.45,length((p-u_mouthBox.xy)/u_mouthBox.zw));
  if(u_excited>.001||u_mouth>.001){vec4 smile=head(p,1.0);h=mix(h,smile,mouthMask*max(u_excited,u_mouth));}
  float edge=min(min(p.x-u_headRect.x,u_headRect.x+u_headRect.z-p.x),min(p.y-u_headRect.y,u_headRect.y+u_headRect.w-p.y));
  return vec4(mix(base.rgb,h.rgb,h.a*smoothstep(0.0,6.0,edge)),base.a);
 }
 vec4 trackEye(vec2 p,vec4 e,float tilt,vec4 c,float open){vec2 q=turn(p-e.xy,tilt)/e.zw;float mask=(1.0-smoothstep(.65,1.22,length(q)))*open;if(mask<.001)return c;return mix(c,paint(p-u_gaze*vec2(2.6,1.35)*mask),mask);}
 void main(){vec2 p=v_uv*u_size;vec4 c=paint(p);if(c.a<.003){gl_FragColor=vec4(0.0);return;}
  float welcome=1.0-step(.5,u_expression),wink=step(1.5,u_expression)*(1.0-step(2.5,u_expression));float open=(welcome+wink)*(1.0-u_blink);
  c=trackEye(p,u_eye0,u_tilt.x,c,open);c=trackEye(p,u_eye1,u_tilt.y,c,welcome*(1.0-u_blink));gl_FragColor=c;
 }`;
 class MimiMesh{
  constructor(canvas){this.canvas=canvas;this.gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:true});if(!this.gl)throw new Error('WebGL unavailable');const g=this.gl;
   const shader=(type,text)=>{const s=g.createShader(type);g.shaderSource(s,text);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw new Error(g.getShaderInfoLog(s));return s;};
   this.program=g.createProgram();this.vs=shader(g.VERTEX_SHADER,vertex);this.fs=shader(g.FRAGMENT_SHADER,fragment);g.attachShader(this.program,this.vs);g.attachShader(this.program,this.fs);g.linkProgram(this.program);if(!g.getProgramParameter(this.program,g.LINK_STATUS))throw new Error(g.getProgramInfoLog(this.program));g.useProgram(this.program);
   this.position=g.createBuffer();this.uv=g.createBuffer();this.index=g.createBuffer();this.texture=g.createTexture();this.headTexture=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.texture);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);
   this.uniforms={};for(const n of ['u_size','u_gaze','u_eye0','u_eye1','u_tilt','u_expression','u_blink','u_excited','u_mouth','u_mouthBox','u_headRect','u_headGain'])this.uniforms[n]=g.getUniformLocation(this.program,n);
   this.pLoc=g.getAttribLocation(this.program,'a_position');this.uvLoc=g.getAttribLocation(this.program,'a_uv');this.ready=false;
  }
  setPose(data,image,headImage){const g=this.gl;this.data=data;this.W=data.canvas[0];this.H=data.canvas[1];g.bindTexture(g.TEXTURE_2D,this.texture);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,image);g.activeTexture(g.TEXTURE1);g.bindTexture(g.TEXTURE_2D,this.headTexture);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,headImage);g.uniform1i(g.getUniformLocation(this.program,'u_paint'),0);g.uniform1i(g.getUniformLocation(this.program,'u_heads'),1);g.activeTexture(g.TEXTURE0);
   const nx=64,ny=96,points=[],uv=[],indices=[];for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){points.push(x/nx*this.W,y/ny*this.H);uv.push(x/nx,y/ny);}
   for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=y*(nx+1)+x,b=a+1,c=a+nx+1,d=c+1;indices.push(a,c,b,b,c,d);}
   this.original=new Float32Array(points);this.vertices=new Float32Array(points.length);this.count=indices.length;
   g.bindBuffer(g.ARRAY_BUFFER,this.uv);g.bufferData(g.ARRAY_BUFFER,new Float32Array(uv),g.STATIC_DRAW);g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,this.index);g.bufferData(g.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),g.STATIC_DRAW);
   this.fields=(data.deformers||[]).map(f=>{const list=[];for(let i=0;i<points.length;i+=2){const x=points[i],y=points[i+1],is=inside(x,y,f.polygon),dist=distance(x,y,f.polygon);let w=is?1:1-smooth(0,f.feather||24,dist);if(f.group==='hair'){for(const e of data.eyeApertures||data.eyes)w*=smooth(1,1.65,Math.hypot((x-e[0])/(e[2]+14),(y-e[1])/(e[3]+12)));}if(w<.001)continue;const p=f.pivot,axis=f.axis||[0,1],ax=x-p[0],ay=y-p[1],length=f.length||200;const along=(ax*axis[0]+ay*axis[1])/length;w*=smooth(f.start??0,f.end??.7,along);if(w<.001)continue;list.push(i,ax*w,ay*w);}return {...f,weights:new Float32Array(list)};});
   this.ready=true;this.resize();
  }
  resize(){const r=this.canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);const w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}this.gl.viewport(0,0,w,h);}
  render(actor){if(!this.ready)return;const g=this.gl;this.resize();const v=this.vertices,p=this.original;v.set(p);
   for(const field of this.fields){const spring=actor.springs[field.id];if(!spring)continue;const a=spring.position*Math.PI/180,c=Math.cos(a)-1,s=Math.sin(a),list=field.weights;for(let j=0;j<list.length;j+=3){const i=list[j],x=list[j+1],y=list[j+2];v[i]+=x*c-y*s;v[i+1]+=x*s+y*c;}}
   for(let i=0;i<v.length;i+=2){v[i]=(v[i]+32)/(this.W+64);v[i+1]=(v[i+1]+32)/(this.H+64);}
   g.useProgram(this.program);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.texture);g.activeTexture(g.TEXTURE1);g.bindTexture(g.TEXTURE_2D,this.headTexture);g.activeTexture(g.TEXTURE0);
   g.bindBuffer(g.ARRAY_BUFFER,this.position);g.bufferData(g.ARRAY_BUFFER,v,g.DYNAMIC_DRAW);g.enableVertexAttribArray(this.pLoc);g.vertexAttribPointer(this.pLoc,2,g.FLOAT,false,0,0);g.bindBuffer(g.ARRAY_BUFFER,this.uv);g.enableVertexAttribArray(this.uvLoc);g.vertexAttribPointer(this.uvLoc,2,g.FLOAT,false,0,0);g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,this.index);
   const u=this.uniforms,e=this.data.eyeApertures||this.data.eyes;g.uniform2f(u.u_size,this.W,this.H);const look=actor.eyeTracking&&!actor.reduced?actor.look:{x:0,y:0};g.uniform2f(u.u_gaze,look.x,look.y);g.uniform4fv(u.u_eye0,e[0]);g.uniform4fv(u.u_eye1,e[1]);g.uniform2fv(u.u_tilt,this.data.eyeTilt||[.22,.27]);g.uniform1f(u.u_expression,{welcome:0,excited:0,happy:1,wink:2,sleepy:3}[actor.expression]||0);g.uniform1f(u.u_blink,['welcome','excited','wink'].includes(actor.expression)?actor.lids.left:0);g.uniform1f(u.u_excited,actor.expression==='excited'?1:0);g.uniform4fv(u.u_headRect,this.data.headRect);g.uniform3fv(u.u_headGain,this.data.headColorGain||[1,1,1]);g.uniform1f(u.u_mouth,actor.mouthAmount||0);g.uniform4fv(u.u_mouthBox,this.data.mouthBox||[...this.data.mouth.slice(0,2),42,28]);g.drawElements(g.TRIANGLES,this.count,g.UNSIGNED_SHORT,0);
  }
  destroy(){const g=this.gl;if(!g)return;for(const b of [this.position,this.uv,this.index])g.deleteBuffer(b);g.deleteTexture(this.texture);g.deleteTexture(this.headTexture);g.deleteProgram(this.program);g.deleteShader(this.vs);g.deleteShader(this.fs);this.ready=false;}
 }
 window.MimiMesh=MimiMesh;
})();
