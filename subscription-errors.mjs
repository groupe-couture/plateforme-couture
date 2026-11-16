// Keep background read failures separate from write/action failures.
export function createSubscriptionErrors(render){
  const failures=new Map(),stops=new Set();
  let actionError=null,forwardedError=null;
  const publish=()=>render([...new Set([actionError,...failures.values()].filter(Boolean))]);
  function report(error){
    if(error===forwardedError)return;
    actionError=error;publish();
  }
  function wrap(onSnapshot){
    return (source,onData,onError)=>{
      const key=Symbol(),generation={alive:true};
      let unsubscribe;
      const stop=()=>{
        if(!generation.alive)return;
        generation.alive=false;stops.delete(stop);failures.delete(key);
        unsubscribe?.();publish();
      };
      stops.add(stop);
      try{
        unsubscribe=onSnapshot(source,snapshot=>{
          if(!generation.alive)return;
          onData(snapshot);
          if(generation.alive&&failures.delete(key))publish();
        },error=>{
          if(!generation.alive)return;
          failures.set(key,error);publish();
          const previous=forwardedError;forwardedError=error;
          try{onError?.(error);}finally{forwardedError=previous;}
        });
        if(!generation.alive)unsubscribe?.();
      }catch(error){stop();throw error;}
      return stop;
    };
  }
  function reset(){
    for(const stop of [...stops])stop();
    actionError=null;failures.clear();publish();
  }
  return {report,wrap,reset};
}
