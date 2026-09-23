import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { Session } from '../domain/models';
import { calculate, formatTime } from '../domain/engine';
import { Button, childColor, palette, ui } from '../components/routine-ui';
import { ChildPanel, CompletedTasks } from '../components/child-panel';
import { VisualTimeCircle } from '../components/visual-time-circle';
import { CompletionCheck } from '../components/completion-message';

export function MorningScreen({ session, now, choose, done, reset, reopen }: {
  session: Session; now: number; choose: (childId: string, taskId: string | null) => void;
  done: (childId: string) => void; reset: () => void;
  reopen: (childId: string, taskId: string) => void;
}) {
  const { width } = useWindowDimensions();
  const result = calculate(session, now);
  const chime = useAudioPlayer(require('../../assets/audio/departure.wav'));
  const chimeStatus = useAudioPlayerStatus(chime);
  const [audioReady, setAudioReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    chime.volume = 0.6;
    void setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers' }).then(() => { if (mounted) setAudioReady(true); }).catch(() => {});
    return () => { mounted = false; };
  }, [chime]);
  const soundSignalled = useRef(result.departureReached);
  useEffect(() => {
    if (!result.departureReached || !audioReady || !chimeStatus.isLoaded || soundSignalled.current) return;
    soundSignalled.current = true;
    chime.play();
  }, [result.departureReached, audioReady, chimeStatus.isLoaded, chime]);
  // Fixed visual scale, derived only from the session's original configuration.
  // Twice initial projected free time leaves space to grow, capped at the entire
  // morning. If initially zero, use the morning length. Never rescale on completion
  // or reopening: the same colored area must continue to mean the same duration.
  const ourTimeReference = useMemo(() => {
    const morningDuration = Math.max(1, session.deadlineAt - session.startedAt);
    const initialWork = session.configuration.routine.tasks.reduce((sum, task) => sum + task.estimatedMs, 0);
    const initialFreeTime = Math.max(0, morningDuration - initialWork);
    return initialFreeTime > 0 ? Math.min(morningDuration, Math.max(60000, initialFreeTime * 2)) : morningDuration;
  }, [session.configuration, session.deadlineAt, session.startedAt]);
  const [confirmReset, setConfirmReset] = useState(false);
  const [completion, setCompletion] = useState<{ id: number; label: string } | null>(null);
  const [activeChild, setActiveChild] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const pager = useRef<ScrollView>(null);
  const wide = width >= 760 && session.childStates.length <= 2;
  useEffect(() => {
    if (!wide && pageWidth > 0) pager.current?.scrollTo({ x: activeChild * pageWidth, animated: false });
  }, [wide, pageWidth, activeChild, result.allReady]);
  const scroll = useRef<ScrollView>(null);
  const panelsTop = useRef(0);
  const childTops = useRef<Record<string, number>>({});
  const completedChild = useRef<string | null>(null);
  useEffect(() => {
    if (!completedChild.current) return;
    const childId = completedChild.current;
    const frame = requestAnimationFrame(() => {
      // DONE may be below the fold on a phone. Bring its confirmation into view.
      scroll.current?.scrollTo({ y: result.allReady ? 0 : panelsTop.current + (childTops.current[childId] ?? 0), animated: false });
      completedChild.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [session.childStates, result.allReady]);
  const signalled = useRef(false);
  useEffect(() => {
    if (result.departureReached && !signalled.current) {
      signalled.current = true;
      scroll.current?.scrollTo({ y: 0, animated: false });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [result.departureReached]);
  const timeSummary = <View style={{ paddingHorizontal: 22, paddingVertical: 12,
      borderTopWidth: result.allReady ? 0 : 1, borderBottomWidth: result.allReady ? 1 : 0,
      borderColor: palette.line, backgroundColor: palette.paper }}>
      <View style={{ width: '100%', maxWidth: 1096, alignSelf: 'center', gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1, justifyContent: 'center' }}><Text style={[ui.label, { letterSpacing: 1 }]}>WE LEAVE IN</Text>
            <Text style={{ fontSize: 32, fontWeight: '600', color: palette.muted, fontVariant: ['tabular-nums'] }}>{formatTime(result.untilDeadlineMs)}</Text>
            <Text style={{ color: palette.muted, fontSize: 14 }}>Ready at {session.configuration.routine.deadlineTime}</Text></View>
          {!result.allReady && <View style={{ alignItems: 'center', gap: 6, padding: 10, borderRadius: 16, backgroundColor: palette.mint }}>
            <Text style={[ui.label, { letterSpacing: 1 }]}>OUR TIME</Text>
            <VisualTimeCircle totalDuration={ourTimeReference} remainingDuration={result.ourTimeMs}
              size={64} label="Our shared free time remaining" />
            <Text style={{ color: palette.green, fontSize: 12, textAlign: 'center' }}>Our shared estimate</Text>
          </View>}
        </View>
      </View>
    </View>;
  return <View style={{ flex: 1, backgroundColor: palette.paper }}>
    {result.allReady && !result.departureReached && timeSummary}
    <ScrollView ref={scroll} contentContainerStyle={[ui.content, result.departureReached && { flexGrow: 1 }]}>
      {result.departureReached ? <View accessibilityLiveRegion="polite"
        style={[ui.card, { flexGrow: 1, paddingVertical: 48, justifyContent: 'center', backgroundColor: palette.peach }]}>
        <Text accessible={false} style={{ fontSize: 88, textAlign: 'center' }}>👟</Text>
        <Text style={[ui.heading, ui.centered, { fontSize: 44 }]}>Time to go</Text>
        <Text style={[ui.body, ui.centered]}>Let’s head out together.</Text>
      </View> : result.allReady ? <View style={[ui.card, { paddingVertical: 32, gap: 26, backgroundColor: '#FFF2C9', borderColor: '#E3BA58' }]}>
        <Text style={[ui.label, ui.centered]}>WE’RE READY!</Text>
        <Text style={[ui.heading, ui.centered]}>This time is ours.</Text>
        <Text style={[ui.body, ui.centered]}>Play, read, or simply be together.</Text>
        <VisualTimeCircle totalDuration={ourTimeReference} remainingDuration={result.ourTimeMs}
          size={width >= 760 ? 340 : 260} label="Our shared free time remaining" />
        <Text style={[ui.centered, { fontSize: 40, fontWeight: '600', color: palette.muted, fontVariant: ['tabular-nums'] }]}>{formatTime(result.ourTimeMs)}</Text>
        {session.childStates.map((child, index) => <View key={child.childId} style={{ gap: 10 }}>
          <Text style={ui.subheading}>{session.configuration.children.find(item => item.id === child.childId)?.name}</Text>
          <CompletedTasks session={session} child={child} reopen={taskId => { setActiveChild(index); reopen(child.childId, taskId); }} />
        </View>)}
      </View> : <View onLayout={event => { panelsTop.current = event.nativeEvent.layout.y; }}
        style={{ gap: 16 }}>
        {!wide && session.childStates.length > 1 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {session.childStates.map((child, index) => <Pressable key={child.childId}
            accessibilityRole="tab" accessibilityState={{ selected: activeChild === index }}
            onPress={() => setActiveChild(index)}
            style={({ pressed }) => ({ flexGrow: 1, flexBasis: session.childStates.length > 2 ? '40%' : 0, minWidth: 0, minHeight: 48, padding: 12, borderRadius: 16,
              alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1,
              borderWidth: 3,
              borderColor: activeChild === index
                ? childColor(session.configuration.children.find(item => item.id === child.childId)?.color, index).accent
                : 'transparent',
              backgroundColor: childColor(session.configuration.children.find(item => item.id === child.childId)?.color, index).background })}>
            <Text style={{ fontSize: 17, fontWeight: '700', textAlign: 'center',
              color: palette.ink }}>
              {session.configuration.children.find(item => item.id === child.childId)?.name || `Child ${index + 1}`}
            </Text>
          </Pressable>)}
        </View>}
        <ScrollView ref={pager} horizontal pagingEnabled scrollEnabled={!wide}
          showsHorizontalScrollIndicator={false} directionalLockEnabled
          onLayout={event => setPageWidth(event.nativeEvent.layout.width)}
          onMomentumScrollEnd={event => {
            if (!wide && pageWidth > 0) setActiveChild(Math.max(0, Math.min(session.childStates.length - 1,
              Math.round(event.nativeEvent.contentOffset.x / pageWidth))));
          }}
          contentContainerStyle={wide ? { flex: 1, gap: 20, alignItems: 'flex-start' } : { alignItems: 'flex-start' }}>
        {session.childStates.map((child, index) => <View key={child.childId}
          accessibilityElementsHidden={!wide && activeChild !== index}
          importantForAccessibility={!wide && activeChild !== index ? 'no-hide-descendants' : 'auto'}
          style={wide ? { flex: 1, minWidth: 0 } : { width: pageWidth }}
          onLayout={event => { childTops.current[child.childId] = event.nativeEvent.layout.y; }}>
          <ChildPanel session={session} child={child} now={now}
            reopen={taskId => reopen(child.childId, taskId)}
            choose={taskId => choose(child.childId, taskId)} done={() => {
              if (!child.activeTask) return;
              const name = session.configuration.children.find(item => item.id === child.childId)?.name;
              const task = session.configuration.routine.tasks.find(item => item.id === child.activeTask?.taskId);
              setCompletion(previous => ({ id: (previous?.id ?? 0) + 1, label: `${name}: ${task?.title} done` }));
              completedChild.current = child.childId;
              done(child.childId);
            }} />
        </View>)}
        </ScrollView>
      </View>}
      {confirmReset ? <View style={ui.card}>
        <Text style={ui.subheading}>End this morning?</Text>
        <Text style={ui.body}>Task progress will be cleared. Your names and estimates stay saved for next time.</Text>
        <Button title="End morning & return to setup" onPress={reset} />
        <Button title="Keep this morning" secondary onPress={() => setConfirmReset(false)} />
      </View> : <Button title="Parent · back to setup" secondary onPress={() => setConfirmReset(true)} />}
      {!result.allReady && !result.departureReached && timeSummary}
    </ScrollView>
    {completion && !result.departureReached && <CompletionCheck key={completion.id} label={completion.label} />}
  </View>;
}
