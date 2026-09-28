// Decorative hero motion controls and source-grounded research interactions.
const hero=document.querySelector('.hero');
const world=document.querySelector('.hero-world');
const motion=document.getElementById('motion');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches,heroVisible=true;
function syncHeroMotion(){
  const stop=paused||!heroVisible||document.hidden;
  world.classList.toggle('is-paused',stop);
  window.F4RFlow?.setPaused(stop);
  motion.setAttribute('aria-pressed',String(paused));
  motion.innerHTML=paused?'Resume animation <span>▷</span>':'Pause animation <span>Ⅱ</span>';
}
motion.addEventListener('click',()=>{paused=!paused;syncHeroMotion();});
reduced.addEventListener('change',()=>{paused=reduced.matches;syncHeroMotion();});
new IntersectionObserver(([entry])=>{heroVisible=entry.isIntersecting;syncHeroMotion();}).observe(hero);
document.addEventListener('visibilitychange',syncHeroMotion);syncHeroMotion();

const pairNames=['stack bowls','stack blocks','pick fruits','hang cup','cup on coaster','cup in bowl','insert cylinder','block in drawer'];
const scene=document.querySelector('.scene-comparison');
const sceneSlider=document.getElementById('scene-slider');
sceneSlider.addEventListener('input',()=>{
  scene.style.setProperty('--split',`${sceneSlider.value}%`);
  sceneSlider.setAttribute('aria-valuetext',`${sceneSlider.value} percent reconstructed`);
});
document.querySelectorAll('[data-pair]').forEach(button=>button.addEventListener('click',()=>{
  const index=Number(button.dataset.pair);
  document.querySelectorAll('[data-pair]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  const real=document.getElementById('comparison-real'),sim=document.getElementById('comparison-sim');
  real.src=`assets/paired-${index}-real.webp`;sim.src=`assets/paired-${index}-sim.webp`;
  real.alt=`Real-world ${pairNames[index]} scene`;sim.alt=`Reconstructed ${pairNames[index]} scene`;
}));

const frameSlider=document.getElementById('evidence-slider');
function setEvidence(index){
  const value=Math.max(0,Math.min(15,Number(index)));
  frameSlider.value=value;
  const frame=String(value).padStart(2,'0');
  document.getElementById('evidence-frame').src=`assets/evidence-${frame}.webp`;
  document.getElementById('evidence-frame').alt=`Synchronized wrist and external camera views, sampled frame ${value+1} of 16`;
  document.getElementById('evidence-index').textContent=`${String(value+1).padStart(2,'0')} / 16`;
  document.getElementById('evidence-prev').disabled=value===0;
  document.getElementById('evidence-next').disabled=value===15;
}
frameSlider.addEventListener('input',()=>setEvidence(frameSlider.value));
document.getElementById('evidence-prev').addEventListener('click',()=>setEvidence(Number(frameSlider.value)-1));
document.getElementById('evidence-next').addEventListener('click',()=>setEvidence(Number(frameSlider.value)+1));setEvidence(0);
