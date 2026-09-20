const {client,send,base,setup,advance,action,delay,sockets}=require('./vampir-qa.cjs');
const fs=require('node:fs'); const results=[];
const log=(kind,data)=>{results.push({kind,...data});console.log(JSON.stringify(results.at(-1)))};
(async()=>{try{
 const cs=await setup(6,{firstNightNoKill:true,allowDoctorSelfProtect:false});const h=cs[0];
 while(h.phase.phase!=='DoctorProtect'){
  const type={VampireVote:'vampire-target',DetectiveInspect:'detective-inspect'}[h.phase.phase];
  const role={VampireVote:'Vampire',DetectiveInspect:'Detective'}[h.phase.phase];
  if(type)for(const c of cs.filter(p=>p.role===role))await action(c,type,cs.find(p=>p.id!==c.id&&p.role!=='Vampire').id);
  const r=await advance(h);if(r.error)throw new Error(JSON.stringify(r));await delay(30);
 }
 const doc=cs.find(c=>c.role==='Doctor');
 log('doctor-illegal-self',{reply:await action(doc,'doctor-protect',doc.id)});
 log('doctor-corrected-target',{reply:await action(doc,'doctor-protect',cs.find(c=>c.id!==doc.id).id)});
 await advance(h);await delay(30);await advance(h);await delay(30);await advance(h);await delay(30);await advance(h);await delay(30);
 if(h.phase.phase!=='DayVote')throw new Error('Expected DayVote, got '+h.phase.phase);
 log('change-confirmed-vote',{first:await action(h,'day-vote',cs[1].id),second:await action(h,'day-vote',cs[2].id)});
 await send(h,'game:pause',base(h),'game:phase');
 log('paused-action',{reply:await action(h,'day-vote',cs[1].id)});
 await send(h,'game:resume',base(h),'game:phase');
 const hostId=h.id;h.s.disconnect();await delay(60);
 log('host-transfer',{transferred:cs[1].room.hostPlayerId!==hostId});
 const re=await client('reconnect');re.identity=h.identity;re.roomCode=h.roomCode;
 const join=await send(re,'room:join',base(re),'room:join');await delay(50);
 log('reconnect',{samePlayer:join.playerId===hostId,restoredRole:re.role,phase:re.phase.phase});
 [...cs,re].forEach(c=>c.s.disconnect());
 for(const intelligence of ['random','balanced','deceptive']){
  const c=await client('bot-'+intelligence);
  const keys=['roleReveal','nightStart','vampireVote','detectiveInspect','doctorProtect','nightResolve','dayStart','mayorElection','guardProtect','dayDiscussion','dayVote','executionResolve','hunterLastBreath','winCheck'];
  const joined=await send(c,'room:create',{identity:c.identity,nickname:'QA Bot Tester',phaseDurations:Object.fromEntries(keys.map(k=>[k,0])),gameMode:'SafeFirstNight',rolePreset:'socialChaos',rules:{mayorEnabled:true,loversEnabled:true}},'room:join');
  c.roomCode=joined.roomCode;c.id=joined.playerId;c.identity.playerSessionToken=joined.playerSessionToken;
  await send(c,'room:bot:add',{...base(c),count:8,intelligence},'room:state');
  await send(c,'room:ready-toggle',{...base(c),isReady:true},'room:state');
  let winner;const speech=[];c.s.on('game:over',v=>winner=v.winner);c.s.on('game:bot:speech',v=>speech.push(v));
  await send(c,'room:start',base(c),'game:phase');await delay(30);
  let steps=0;const phases=[];const errors=[];
  while(c.phase.phase!=='GameOver'&&steps++<180){
   const phase=c.phase.phase;phases.push(phase);
   const type={VampireVote:'vampire-target',DetectiveInspect:'detective-inspect',DoctorProtect:'doctor-protect',GuardProtect:'guard-protect',HunterLastBreath:'hunter-shot',MayorElection:'mayor-vote',DayVote:'day-vote'}[phase];
   const role={VampireVote:'Vampire',DetectiveInspect:'Detective',DoctorProtect:'Doctor',GuardProtect:'Guard',HunterLastBreath:'Hunter'}[phase];
   const me=c.room.players.find(p=>p.playerId===c.id);
   if(type&&(!role||role===c.role)&&(me.isAlive||phase==='HunterLastBreath')){
    for(const target of c.room.players.filter(p=>p.isAlive&&p.playerId!==c.id)){
     const response=await action(c,type,target.playerId);if(!response.error)break;
    }
   }
   let response;
   for(let tries=0;tries<12;tries++){
    response=await advance(c);if(!response.error)break;
    if(response.error.code!=='PHASE_ACTIONS_PENDING'){errors.push(response.error);break}
    await delay(250);
   }
   if(response.error){errors.push(response.error);break}await delay(25);
  }
  log('bot-match',{intelligence,status:c.room.status,winner,round:c.phase.round,steps,roles:c.room.players.map(p=>p.role),phases:[...new Set(phases)],errors,speechCount:speech.length,speechSample:speech.slice(0,3)});
  c.s.disconnect();await delay(100);
 }
}finally{sockets.forEach(s=>s.disconnect());fs.writeFileSync(require('node:path').join(__dirname,'vampir-qa-extra-results.json'),JSON.stringify(results,null,2))}})().catch(e=>{console.error(e);process.exitCode=1});
