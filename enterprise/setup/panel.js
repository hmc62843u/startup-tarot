'use strict';
const buttons=[...document.querySelectorAll('[data-action]')];
async function act(action){
 buttons.forEach(b=>b.disabled=true);document.getElementById('status').textContent=action==='check'?'Checking…':'Working…';
 try{
  const response=await fetch('action',{method:'POST',headers:{'Content-Type':'application/json','X-Setup-Action':'1'},body:JSON.stringify({action})});
  const value=await response.json();if(!response.ok)throw new Error(value.error);
  for(const id of ['node','configuration','database','workspace'])document.getElementById(id).textContent=value[id]?'Ready':id==='database'&&!value.configuration?'Not checked':id==='workspace'&&!value.configuration?'Not checked':'Needs attention';
  document.getElementById('next').textContent=value.next;document.getElementById('status').textContent='Checked '+new Date(value.checked_at).toLocaleTimeString();
 }catch(error){for(const id of ['node','configuration','database','workspace'])document.getElementById(id).textContent='Not checked';document.getElementById('next').textContent='Return to Codex to resolve setup.';document.getElementById('status').textContent=error.message;}
 finally{buttons.forEach(b=>b.disabled=false);}
}
buttons.forEach(button=>button.addEventListener('click',()=>act(button.dataset.action)));act('check');
