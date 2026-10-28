/** Human-readable context labels; independent of matching and storage. */
export function describeSituation(startup, started) {
  const modelNames={marketplace:'a marketplace',service:'a service business',saas:'a software business',hardware:'a hardware business',consumer_product:'a consumer product',other:'a business idea'};
  const stageNames={'pre-company':'before company formation',idea:'exploring an idea','pre-seed':'testing with users / pre-seed',seed:'at seed stage','series-a':'at Series A',growth:'at a later stage'};
  const questionNames={customer_problem:'understanding customer problems',demand:'testing demand',operations:'testing how the service would work',technical_feasibility:'testing technical feasibility',investor_outreach:'exploring investor conversations'};
  const situation=!started?'Your situation has not been recorded yet.':
    (modelNames[startup.business_model]?'You’re working on '+modelNames[startup.business_model]+'. ':'Your business model is not recorded yet. ')+
    (stageNames[startup.current_stage]?'Your stage: '+stageNames[startup.current_stage]+'.':'Your stage is not yet clear.');
  const currentQuestion=questionNames[startup.validation_focus]?'You want to work on '+questionNames[startup.validation_focus]+'.':'Your next question is still open.';
  const shortModels={marketplace:'Marketplace',service:'Service business',saas:'Software / SaaS',hardware:'Hardware',consumer_product:'Consumer product',other:'Other business'};
  const shortStages={'pre-company':'Pre-company',idea:'Idea','pre-seed':'Pre-seed',seed:'Seed','series-a':'Series A',growth:'Growth'};
  const shortQuestions={customer_problem:'Customer problems',demand:'Demand',operations:'Operations',technical_feasibility:'Technical feasibility',investor_outreach:'Investor conversations'};
  const situationShort=started?[shortModels[startup.business_model]||'Business model open',shortStages[startup.current_stage]||'Stage open',shortQuestions[startup.validation_focus]||'Question open'].join(' · '):'Start with what you know. “Not sure yet” is fine.';
  return {situation,situationShort,currentQuestion};
}

/** Explain a selected action without deciding candidate eligibility. */
export function describeNextAction({started,next,candidate,pending,lensCount,libraryDiscovery,validationFocus,connectionReason,support}) {
  const simpleMoves={
    'suggestion:customer-evidence':['Ask about a recent customer problem.','A recent experience helps you choose what to test before building.'],
    'suggestion:product-evidence':['Describe what you have and one thing to test.','A clear question helps you choose a small test; a prototype is not required.'],
    'suggestion:team-evidence':['Name one capability your team needs.','Knowing where you need help makes the next step more manageable.'],
    'suggestion:next-milestone':['Choose one small test.','Test one uncertainty before committing more time.']
  };
  if(validationFocus==='demand')simpleMoves['suggestion:next-milestone']=['Plan your own demand test.','Choose a small way to check whether people want what you offer.'];
  if(validationFocus==='operations')simpleMoves['suggestion:next-milestone']=['Plan a small delivery test.','Choose one delivery uncertainty and decide what you would record.'];
  const nextAction=!started?{title:'Start with three choices.',reason:'Tell us what you are building, where you are, and your next question.',label:'Set up my workspace',route:'setup'}:
    pending?{title:candidate.title,reason:candidate.sources.every(source=>source.data_kind==='fictional')?'In these fictional examples, a startup approach and investor interest connect with your model, stage and chosen question.':'The library connects a dated startup approach and an investor topic with your model, stage and chosen question. Review the sources before adapting it.',label:'Review this move',route:'plan',sources:candidate.sources,basis:(lensCount?'Uses the investor lens you selected. ':'Preview from the active library; no investor lens has been selected. ')+ 'An authored interpretation connecting the selected library records; it is not proof of an outcome.'}:
    next?{title:next.basis==='optional_suggestion'?(simpleMoves[next.id]?.[0]||next.title):next.title,reason:next.basis==='optional_suggestion'?(simpleMoves[next.id]?.[1]||next.reason):next.basis==='published_requirement'?'The selected profile lists a rule to check. Confirm its source and whether it applies to your situation.':next.reason,label:'Try this move',route:'plan',taskId:next.id,
      sources:next.sources,basis:next.basis==='optional_suggestion'?'Based on your workspace. No library sources are attached to this exercise. It is not a finding from startup research.':next.basis==='combined_suggestion'?'An adaptation you accepted from the selected library. Its sources and limits are in your move.':'A question from a profile you selected. Inclusion does not establish eligibility or investor interest.'}:
    {title:'Review the evidence you recorded.',reason:'Review your sources and decide what to continue, change or stop.',label:'Review my next moves',route:'plan'};
  if(pending&&candidate.supportKind==='snapshot_only'){
    nextAction.heading='A startup example to explore';
    nextAction.connectionNote='Startup example only. No matching investor interest is documented.';
    nextAction.reason='An authored rule links this startup approach to your model, stage and question. Review the dated evidence and limits before adapting it.';
    nextAction.basis='This suggestion uses startup snapshot evidence only. It does not establish investor alignment or show that the approach caused an outcome.';
    nextAction.label='Explore this example';
  }else if(pending&&started){
    nextAction.heading=lensCount?'Your next move':'An example to explore';
    nextAction.connectionNote=lensCount?'Connected through your selected investor.':'Preview from the library. No investor selected.';
    if(!lensCount)nextAction.label='Explore this example';
  }
  if(!pending&&next?.basis==='combined_suggestion'){
    nextAction.label='Edit plan';
    if(next.supportKind==='snapshot_only')nextAction.connectionNote='Your adapted startup example. No matching investor interest is documented.';
  }
  if(!pending&&support?.kind==='investor_only')nextAction.partialSupport=support;
  if(nextAction.basis){
    const sourced=nextAction.sources?.length>0;
    const fictional=sourced&&nextAction.sources.every(source=>source.data_kind==='fictional');
    nextAction.basisLabel=sourced?(fictional?'Based on fictional examples':'Based on research sources'):'General exercise';
    if(!sourced){
      nextAction.generalExercise=true;
      nextAction.disclosureLabel='About this exercise';
      if(support?.kind==='investor_only')nextAction.connectionNote='Investor interest only. No matching startup example is encoded.';
      nextAction.generalNote='General exercise · no supporting library connection.';
      const reasons={
        missing_investor_topic:'Stage and sector checks pass, but the library has no matching investor topic to support a next move.',
        missing_topic_unconfirmed_sector:'The library has no matching investor topic for this situation. Sector fit is also unconfirmed.',
        missing_rule:'The library has no startup approach encoded for your model, stage and question with the selected investor profiles.',
        incomplete_context:'Some of your situation is still unknown. The library cannot establish a connection from those details.',
        incompatible_profile:'The selected profiles do not pass the recorded stage or sector checks for a connected move.'
      };
      nextAction.connectionGap=libraryDiscovery.length?{
        title:'No further connected moves to review',message:'You have already reviewed the matching examples for this situation. This exercise is separate.'
      }:{
        title:lensCount===1?'No connected move for this investor yet':lensCount?'No connected move for these investors yet':'No connected example for this situation yet',
        message:reasons[connectionReason]||'The active library has no supported connection for your recorded situation.'
      };
      if(next?.progress?.experiment){
        nextAction.disclosureLabel='About your saved plan';
        nextAction.title='Continue your saved plan.';
        nextAction.label='Edit plan';
        nextAction.generalNote='Your saved plan · no current library connection.';
        nextAction.reason='Your experiment fields and notes are kept. Review whether the plan still fits your situation.';
        nextAction.basis='Your saved plan remains editable independently of the current investor lens. No supporting library connection is active for this plan.';
      }else if(validationFocus==='demand'&&next?.id==='suggestion:next-milestone')nextAction.label='Plan this test';
    }
  }
  if(started&&!pending&&next&&(next.basis==='combined_suggestion'||next.progress?.experiment)){
    nextAction.heading='Your current experiment';
    nextAction.reasonHeading='What you’ll try';
    nextAction.reason=next.progress?.experiment?.action||next.experimentPlan?.action||next.reason;
    nextAction.label='Continue editing';
    nextAction.savedExperiment=true;
    if(!nextAction.generalExercise)nextAction.connectionNote=next.supportKind==='snapshot_only'
      ?'Startup example only · no documented investor alignment.'
      :'Startup example + investor interest · not an endorsement.';
  }
  return nextAction;
}
