import{firebaseConfig}from'./firebase-config.js';
const appUI=window.BiBuApp,button=document.getElementById('cloudButton');
const configured=firebaseConfig.apiKey&&!firebaseConfig.apiKey.startsWith('PASTE_')&&firebaseConfig.appId&&!firebaseConfig.appId.startsWith('PASTE_');
if(!configured){appUI.setCloudStatus('本機儲存');button.textContent='設定雲端同步';button.onclick=()=>appUI.showToast('請先填寫 firebase-config.js');}
else{
  try{
    const[{initializeApp},{getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged},{initializeFirestore,persistentLocalCache,persistentMultipleTabManager,doc,getDoc,setDoc,onSnapshot,serverTimestamp}]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js')
    ]);
    const firebaseApp=initializeApp(firebaseConfig),auth=getAuth(firebaseApp),db=initializeFirestore(firebaseApp,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})}),provider=new GoogleAuthProvider();
    let user=null,cloudReady=false,saveTimer,stopListen=()=>{},stopLocal=()=>{};
    button.onclick=async()=>{try{if(user)await signOut(auth);else await signInWithPopup(auth,provider)}catch(err){appUI.showToast(err.code==='auth/popup-blocked'?'瀏覽器封鎖登入視窗':'登入未完成')}};
    onAuthStateChanged(auth,async current=>{
      stopListen();stopLocal();user=current;cloudReady=false;
      if(!user){button.textContent='Google 登入';appUI.setCloudStatus('本機儲存');return}
      button.textContent='登出 '+(user.displayName||'Google');appUI.setCloudStatus('連接雲端中…');
      const ref=doc(db,'users',user.uid,'trips','hokkaido-2026'),existing=await getDoc(ref);
      if(!existing.exists())await setDoc(ref,{...appUI.getState(),updatedAt:serverTimestamp()});
      stopListen=onSnapshot(ref,snapshot=>{if(snapshot.exists()){const data=snapshot.data();if(cloudReady||data.updatedAt)appUI.applyRemoteState(data);cloudReady=true;appUI.setCloudStatus('雲端已同步',true)}},()=>appUI.setCloudStatus('同步失敗'));
      stopLocal=appUI.subscribe(next=>{if(!cloudReady)return;clearTimeout(saveTimer);saveTimer=setTimeout(()=>setDoc(ref,{...next,updatedAt:serverTimestamp()},{merge:true}).then(()=>appUI.setCloudStatus('雲端已同步',true)).catch(()=>appUI.setCloudStatus('同步失敗')),500)});
    });
  }catch(err){appUI.setCloudStatus('本機儲存');button.textContent='雲端同步未啟用';button.onclick=()=>appUI.showToast('Firebase設定未完成');}
}
