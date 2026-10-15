'use strict';
// Passwords never enter the published game state.
let remoteSignature='';
function renderConnections(remote){
  remote=remote||{connections:[],canRemember:false};
  $('remote-remember').disabled=!remote.canRemember;
  if(!remote.canRemember)$('remote-remember').checked=false;
  const signature=JSON.stringify(remote);if(signature===remoteSignature)return;remoteSignature=signature;
  $('remote-list').replaceChildren();
  if(remote.error)$('remote-list').append(node('p','',remote.error));
  if(!remote.connections.length)$('remote-list').append(node('p','muted','등록한 원격 PC가 없어요. 아래에서 직접 추가해 주세요.'));
  for(const entry of remote.connections){
    const card=node('section','remote-card'),heading=node('div','remote-heading'),body=node('div');card.dataset.remoteId=entry.id;
    body.append(node('h3','',entry.name),node('small','muted',entry.username+'@'+entry.host+':'+entry.port));heading.append(body,node('b',entry.connected?'remote-online':'',entry.connected?'연결됨':entry.state==='connecting'?'연결 중':'연결 안 됨'));card.append(heading,node('p','',entry.message));
    const actions=node('div','remote-actions');
    const action=(text,kind,value)=>{const button=node('button','',text);button.type='button';button.onclick=()=>window.buddy.action(kind,value);actions.append(button);return button;};
    if(entry.state==='trust'){
      card.append(node('code','remote-fingerprint',entry.candidate));
      action('지문 확인 후 연결','remote-trust',{id:entry.id,fingerprint:entry.candidate});
    }else if(!['connecting','changed'].includes(entry.state)){
      const secret=node('input');secret.type='password';secret.autocomplete='off';secret.placeholder=entry.auth==='key'?'키 암호 (있는 경우)':'비밀번호';secret.setAttribute('aria-label',entry.name+' 로그인 정보');
      const remember=node('input');remember.type='checkbox';remember.disabled=!remote.canRemember;const label=node('label','remote-remember','암호화 저장');label.prepend(remember);
      if(!entry.connected){
        actions.append(secret,label);const connect=node('button','','연결');connect.type='button';
        connect.onclick=()=>{window.buddy.action('remote-connect',{id:entry.id,...(secret.value?{credentials:{secret:secret.value,remember:remember.checked}}:{})});secret.value='';};actions.append(connect);
      }
    }
    if(entry.enabled&&entry.state!=='stopped')action('연결 중지','remote-stop',entry.id);
    action('삭제','remote-remove',entry.id);card.append(actions);$('remote-list').append(card);
  }
}
function initConnections(){
$('remote-auth').onchange=()=>{$('remote-key-label').hidden=$('remote-auth').value!=='key';$('remote-secret-label').textContent=$('remote-auth').value==='key'?'개인키 암호 (있는 경우)':'비밀번호';};
$('remote-key-pick').onclick=()=>window.buddy.action('remote-key-file');
window.buddy.onKeyFile(file=>{$('remote-key').value=file;});
$('remote-form').onsubmit=event=>{
  event.preventDefault();
  const config={name:$('remote-name').value,host:$('remote-host').value,username:$('remote-user').value,port:Number($('remote-port').value),auth:$('remote-auth').value,keyPath:$('remote-key').value,nodePath:$('remote-node').value};
  window.buddy.action('remote-add',{config,secret:$('remote-secret').value,remember:$('remote-remember').checked});$('remote-secret').value='';
};
}
