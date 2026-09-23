import { useState } from 'react';
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from 'react-native';
import {
	Button,
	Card,
	TaskIcon,
	childColor,
	childColors,
	ui,
} from '../components/routine-ui';
import { TimeWheel } from '../components/time-wheel';
import { deadlineToday } from '../domain/engine';
import type { Configuration } from '../domain/models';

export function SetupScreen({
	configuration,
	onChange,
	onStart,
}: {
	configuration: Configuration;
	onChange: (configuration: Configuration) => void;
	onStart: () => void;
}) {
	const [error, setError] = useState('');
	const { children, routine } = configuration;
	const ready =
		children.length >= 1 &&
		children.length <= 4 &&
		children.every((c) => c.name.trim()) &&
		routine.tasks.every((t) => t.estimatedMs > 0);
	function start() {
		const deadline = deadlineToday(routine.deadlineTime, Date.now());
		if (deadline === null) {
			setError('Choose a departure time.');
			return;
		}
		if (deadline <= Date.now()) {
			setError('Choose a departure time later today.');
			return;
		}
		setError('');
		try {
			onStart();
		} catch (reason) {
			setError(
				reason instanceof Error
					? reason.message
					: 'Please check your names, estimates and departure time.',
			);
		}
	}
	return (
		<KeyboardAvoidingView
			style={{ flex: 1 }}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<ScrollView
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={ui.content}
			>
				<View style={{ gap: 10 }}>
					<Text style={ui.label}>OUR TIME / MORNING</Text>
					<Text style={ui.heading}>
						Get ready together,{'\n'}The time that’s left is ours.
					</Text>
				</View>
				<Card>
					<Text style={ui.subheading}>Who’s getting ready?</Text>
					{children.map((child, index) => (
						<View key={child.id} style={{ gap: 8 }}>
							<View
								style={{
									flexDirection: 'row',
									alignItems: 'center',
									justifyContent: 'space-between',
								}}
							>
								<Text style={ui.label}>CHILD {index + 1}</Text>
								{children.length > 1 && (
									<Pressable
										accessibilityRole="button"
										accessibilityLabel={`Remove ${child.name || `child ${index + 1}`}`}
										onPress={() =>
											onChange({
												...configuration,
												children: children.filter(
													(c) => c.id !== child.id,
												),
											})
										}
										style={{
											minHeight: 44,
											padding: 10,
											justifyContent: 'center',
										}}
									>
										<Text style={ui.body}>Remove</Text>
									</Pressable>
								)}
							</View>
							<TextInput
								accessibilityLabel={`Child ${index + 1} name`}
								placeholder="Name"
								value={child.name}
								maxLength={30}
								autoCapitalize="words"
								style={ui.input}
								onChangeText={(name) =>
									onChange({
										...configuration,
										children: children.map((c) =>
											c.id === child.id
												? { ...c, name }
												: c,
										),
									})
								}
							/>
							<Text style={ui.label}>COLOR</Text>
							<View
								style={{
									flexDirection: 'row',
									flexWrap: 'wrap',
									gap: 8,
								}}
							>
								{childColors.map((color) => {
									const selected =
										childColor(child.color, index).id ===
										color.id;
									return (
										<Pressable
											key={color.id}
											accessibilityRole="radio"
											accessibilityLabel={`${child.name || `Child ${index + 1}`}: ${color.name}`}
											accessibilityState={{
												checked: selected,
											}}
											onPress={() =>
												onChange({
													...configuration,
													children: children.map(
														(c) =>
															c.id === child.id
																? {
																		...c,
																		color: color.id,
																	}
																: c,
													),
												})
											}
											style={({ pressed }) => ({
												minWidth: 48,
												minHeight: 48,
												borderRadius: 24,
												alignItems: 'center',
												justifyContent: 'center',
												backgroundColor:
													color.background,
												borderWidth: 3,
												borderColor: selected
													? color.accent
													: 'transparent',
												opacity: pressed ? 0.7 : 1,
											})}
										>
											<View
												style={{
													width: 30,
													height: 30,
													borderRadius: 15,
													backgroundColor:
														color.accent,
													alignItems: 'center',
													justifyContent: 'center',
												}}
											>
												{selected && (
													<Text
														style={{
															color: 'white',
															fontSize: 20,
														}}
													>
														✓
													</Text>
												)}
											</View>
										</Pressable>
									);
								})}
							</View>
						</View>
					))}
					{children.length < 4 && (
						<Button
							title="+ Add child"
							secondary
							onPress={() => {
								let number = 1;
								while (
									children.some(
										(child) =>
											child.id === `child-${number}`,
									)
								)
									number++;
								const unusedColor = childColors.find(
									(color) =>
										!children.some(
											(child, index) =>
												childColor(child.color, index)
													.id === color.id,
										),
								);
								onChange({
									...configuration,
									children: [
										...children,
										{
											id: `child-${number}`,
											name: '',
											color:
												unusedColor?.id ??
												childColors[0].id,
										},
									],
								});
							}}
						/>
					)}
				</Card>
				<Card>
					<Text style={ui.subheading}>We need to be ready at</Text>
					<TimeWheel
                        value={routine.deadlineTime}
                        onChange={(deadlineTime) => {
                            setError('');
                            onChange({ ...configuration, routine: { ...routine, deadlineTime } });
                        }}
                    />
					<Text style={ui.body}>
						Today’s departure · 24-hour clock
					</Text>
				</Card>
				<View style={{ gap: 8 }}>
					<Text style={ui.subheading}>Let’s make our estimates</Text>
					<Text style={ui.body}>
						How long do we think each task will take? Choose
						together. These are estimates, not limits.
					</Text>
				</View>
				{routine.tasks.map((task) => (
					<Card key={task.id}>
						<View style={ui.row}>
							<TaskIcon icon={task.icon} />
							<Text style={[ui.subheading, { flex: 1 }]}>
								{task.title}
							</Text>
						</View>
						<View style={ui.row}>
							<View style={{ width: 58 }}>
								<Button
									title="−"
									label={`Decrease ${task.title} estimate`}
									secondary
									disabled={task.estimatedMs <= 0}
									onPress={() =>
										onChange({
											...configuration,
											routine: {
												...routine,
												tasks: routine.tasks.map((t) =>
													t.id === task.id
														? {
																...t,
																estimatedMs:
																	Math.max(
																		0,
																		t.estimatedMs -
																			60000,
																	),
															}
														: t,
												),
											},
										})
									}
								/>
							</View>
							<Text
								style={[
									ui.centered,
									{
										flex: 1,
										fontSize: 40,
										lineHeight: 48,
										fontWeight: '700',
										color: '#293E37',
										fontVariant: ['tabular-nums'],
									},
								]}
							>
								{task.estimatedMs / 60000} min
							</Text>
							<View style={{ width: 58 }}>
								<Button
									title="+"
									label={`Increase ${task.title} estimate`}
									secondary
									disabled={task.estimatedMs >= 120 * 60000}
									onPress={() =>
										onChange({
											...configuration,
											routine: {
												...routine,
												tasks: routine.tasks.map((t) =>
													t.id === task.id
														? {
																...t,
																estimatedMs:
																	t.estimatedMs +
																	60000,
															}
														: t,
												),
											},
										})
									}
								/>
							</View>
						</View>
					</Card>
				))}
				{!ready && (
					<Text style={ui.body}>
						Add a name for each child and an estimate for each task
						to begin.
					</Text>
				)}
				{!!error && (
					<Text accessibilityRole="alert" style={ui.body}>
						{error}
					</Text>
				)}
				<Button
					title="Start our morning  →"
					disabled={!ready}
					onPress={start}
				/>
				<Text style={[ui.body, ui.centered]}>
					One shared morning. One shared OUR TIME.
				</Text>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}
