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
    if(entry.connected&&entry.trustSource)card.append(node('small','muted',entry.trustSource==='ssh'?'기존 SSH 접속 기록과 일치해 자동으로 확인했어요.':'이 앱에 등록한 서버 정보와 일치해요.'));
    const actions=node('div','remote-actions');
    const action=(text,kind,value)=>{const button=node('button','',text);button.type='button';button.onclick=()=>window.buddy.action(kind,value);actions.append(button);return button;};
    if(['trust','changed','revoked'].includes(entry.state)){
      card.append(node('b','','연결할 서버의 식별 번호'));
      card.append(node('code','remote-fingerprint',entry.candidate));
      if(entry.fingerprint&&entry.fingerprint!==entry.candidate){card.append(node('small','muted','이 앱에 기존 등록된 서버 번호'),node('code','remote-fingerprint',entry.fingerprint));}
      const help=node('details','remote-trust-help');help.append(node('summary','','서버 확인 방법'));
      help.append(node('p','','원격 PC의 화면이나 이미 신뢰한 접속에서 아래 명령을 실행해요. 출력된 SHA256 번호 중 위 번호와 같은 값이 있으면 이 PC를 등록할 수 있어요.'));
      help.append(node('b','','Linux / macOS'),node('code','remote-fingerprint','for key in /etc/ssh/ssh_host_*_key.pub; do ssh-keygen -lf "$key" -E sha256; done'));
      help.append(node('b','','Windows PowerShell'),node('code','remote-fingerprint','Get-ChildItem "$env:ProgramData\\ssh\\ssh_host_*_key.pub" | ForEach-Object { ssh-keygen -lf $_.FullName -E sha256 }'));card.append(help);
      if(entry.state==='trust')action('이 PC를 등록하고 연결','remote-trust',{id:entry.id,fingerprint:entry.candidate});
    }else if(!['connecting','changed','revoked'].includes(entry.state)){
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
