import { ActivityIndicator, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRoutine } from '../hooks/use-routine';
import { changeTask, completeTask, reopenTask, startSession } from '../domain/engine';
import { SetupScreen } from '../screens/setup-screen';
import { MorningScreen } from '../screens/morning-screen';
import { Button, ui } from '../components/routine-ui';

export default function HomeScreen() {
  const { state, now, error, update, retry } = useRoutine();
  return <View style={ui.page}>
    {error && <View style={{ padding: 16, gap: 8 }}><Text accessibilityRole="alert" style={ui.body}>{error}</Text><Button title="Try saving / loading again" secondary onPress={retry} /></View>}
    {!state ? <ActivityIndicator accessibilityLabel="Loading your morning" style={{ margin: 40 }} /> : state.session
      ? <MorningScreen session={state.session} now={now}
          reopen={(childId, taskId) => update(s => ({ ...s, session: s.session ? reopenTask(s.session, childId, taskId) : null }))}
          choose={(childId, taskId) => update(s => ({ ...s, session: s.session ? changeTask(s.session, childId, taskId, Date.now()) : null }))}
          done={childId => {
            update(s => ({ ...s, session: s.session ? completeTask(s.session, childId, Date.now()) : null }));
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }}
          reset={() => update(s => ({ ...s, session: null }))} />
      : <SetupScreen configuration={state.configuration}
          onChange={configuration => update(s => ({ ...s, configuration }))}
          onStart={() => update(s => ({ ...s, session: startSession(s.configuration, Date.now()) }))} />}
  </View>;
}
