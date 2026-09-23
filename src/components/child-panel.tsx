import { useState } from 'react';
import { Text, View, Pressable, useWindowDimensions } from 'react-native';
import type { ChildState, Session } from '../domain/models';
import { formatTime, taskElapsed } from '../domain/engine';
import { Button, TaskIcon, childColor, palette, taskColor, ui } from './routine-ui';
import { VisualTimeCircle } from './visual-time-circle';

export function CompletedTasks({ session, child, reopen }: {
  session: Session; child: ChildState; reopen: (taskId: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const completed = session.configuration.routine.tasks.filter(task => child.completedTaskIds.includes(task.id));
  const selectedTask = completed.find(task => task.id === selected);
  if (!completed.length) return null;
  return <View style={{ gap: 10 }}>
    <Text style={ui.label}>DONE · {completed.length}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {completed.map(task => <Pressable key={task.id} accessibilityRole="button"
        accessibilityLabel={`${task.title}, done. Change status`}
        accessibilityState={{ expanded: selected === task.id }}
        onPress={() => setSelected(selected === task.id ? null : task.id)}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6,
          minHeight: 44, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
          backgroundColor: palette.mint, opacity: pressed ? 0.7 : 1 })}>
        <TaskIcon icon={task.icon} size={20} />
        <Text style={{ fontSize: 13, color: palette.green }}>✓ {task.title}</Text>
      </Pressable>)}
    </View>
    {selectedTask && <View style={{ gap: 8 }}>
      <Text style={ui.body}>{selectedTask.title} is marked done.</Text>
      <Button title="Mark as not done" secondary onPress={() => { reopen(selectedTask.id); setSelected(null); }} />
    </View>}
  </View>;
}

export function ChildPanel({ session, child, now, choose, done, reopen }: {
  session: Session; child: ChildState; now: number; choose: (taskId: string | null) => void; done: () => void;
  reopen: (taskId: string) => void;
}) {
  const { width } = useWindowDimensions();
  const name = session.configuration.children.find(c => c.id === child.childId)?.name;
  const childIndex = session.configuration.children.findIndex(c => c.id === child.childId);
  const color = childColor(session.configuration.children[childIndex]?.color, childIndex);
  const tasks = session.configuration.routine.tasks;
  const remaining = tasks.filter(t => !child.completedTaskIds.includes(t.id));
  const active = tasks.find(t => t.id === child.activeTask?.taskId);
  const elapsed = active ? taskElapsed(child, active.id, now) : 0;
  const activeColor = taskColor(tasks.findIndex(task => task.id === active?.id));
  return <View style={[ui.card, { flex: 1, minWidth: 0, backgroundColor: color.background }]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color.accent }} />
      <Text style={[ui.heading, { flex: 1, color: color.accent }]}>{name}</Text>
    </View>
    <CompletedTasks session={session} child={child} reopen={reopen} />
    {active ? <View style={{ gap: 16 }}>
      <View style={{ alignItems: 'center', gap: 8, backgroundColor: activeColor.background, borderRadius: 22, padding: 14 }}>
        <TaskIcon icon={active.icon} size={64} /><Text style={[ui.subheading, ui.centered]}>{active.title}</Text>
      </View>
      <VisualTimeCircle key={active.id} totalDuration={active.estimatedMs}
        remainingDuration={Math.max(0, active.estimatedMs - elapsed)} size={width >= 760 ? 280 : 224}
        label={`${name}: ${active.title}, estimated time remaining`} color={activeColor.accent} />
      <Button title="✓  DONE" label={`${name}: ${active.title} done`} onPress={done} />
      <Text style={[ui.centered, { fontSize: elapsed >= active.estimatedMs ? 14 : 32,
        lineHeight: elapsed >= active.estimatedMs ? 20 : 40, fontWeight: '500', color: palette.muted, fontVariant: ['tabular-nums'] }]}>
        {elapsed >= active.estimatedMs ? 'Our estimate has passed. Keep going gently.'
          : formatTime(active.estimatedMs - elapsed)}
      </Text>
      <Button title="Choose another" secondary onPress={() => choose(null)} />
    </View> : remaining.length ? <View style={{ gap: 16 }}>
      <Text style={ui.body}>What do you want to do next?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {remaining.map(task => <Pressable key={task.id} accessibilityRole="button" accessibilityLabel={`${name}: ${task.title}`}
          onPress={() => choose(task.id)} style={({ pressed }) => ({ width: '47%', flexGrow: 1, minHeight: 140,
            alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 20,
            backgroundColor: taskColor(tasks.findIndex(t => t.id === task.id)).background,
            borderWidth: 2, borderColor: taskColor(tasks.findIndex(t => t.id === task.id)).accent,
            opacity: pressed ? 0.65 : 1 })}>
          <TaskIcon icon={task.icon} /><Text style={{ fontSize: 18, fontWeight: '600', color: palette.ink, textAlign: 'center' }}>{task.title}</Text>
        </Pressable>)}
      </View>
    </View> : <Text style={ui.body}>You’re ready.</Text>}
  </View>;
}
