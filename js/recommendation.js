/** Stable Home priority policy. Inputs are matched candidates and prepared tasks. */
export function selectNextMove(tasks, suggestions, libraryPreview, validationFocus) {
  const goalTask={customer_problem:'suggestion:customer-evidence',demand:'suggestion:next-milestone',
    operations:'suggestion:next-milestone',technical_feasibility:'suggestion:product-evidence'};
  const unfinished=tasks.filter(task=>task.progress.status!=='evidence_recorded');
  const next=unfinished.find(task=>task.progress.status==='in_progress'&&task.sources.length)
    ||unfinished.find(task=>task.basis==='combined_suggestion')
    ||unfinished.find(task=>task.sources.length)
    ||unfinished.find(task=>task.progress.status==='in_progress')
    ||unfinished.find(task=>task.id===goalTask[validationFocus])
    || (validationFocus==='investor_outreach' ? unfinished.find(task=>task.basis==='published_requirement') : unfinished.find(task=>task.id==='suggestion:next-milestone')) ||unfinished[0];
  const candidate=suggestions.find(suggestion=>suggestion.decision==='pending')||libraryPreview[0];
  const pending=!!candidate&&!((next?.sources.length||next?.progress.experiment)&&next.progress.status==='in_progress');
  return {next,candidate,pending};
}
