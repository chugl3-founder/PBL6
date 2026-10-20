import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
  Text,
} from 'react-native';
import { AiEventData } from '../types/replay';

interface TouchTimelineProps {
  duration: number; // in seconds
  currentTime: number; // in seconds
  events: AiEventData[];
  selectedEventId?: number;
  onSeek: (seconds: number) => void;
  onSelectEvent: (event: AiEventData) => void;
}

const STROKE_COLORS: Record<string, string> = {
  SMASH: '#ef4444',
  DROP: '#06b6d4',
  CLEAR: '#eab308',
  SERVE: '#10b981',
  LIFT: '#8b5cf6',
  DRIVE: '#ec4899',
  NET_SHOT: '#3b82f6',
};

export const TouchTimeline: React.FC<TouchTimelineProps> = ({
  duration,
  currentTime,
  events,
  selectedEventId,
  onSeek,
  onSelectEvent,
}) => {
  const barLayoutRef = useRef<{ width: number; pageX: number }>({ width: 1, pageX: 0 });

  const validDuration = duration > 0 ? duration : 1;
  const progressRatio = Math.min(1, Math.max(0, currentTime / validDuration));

  // Tương tác kéo thả (scrubbing) trên timeline
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        handleTouch(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        handleTouch(evt.nativeEvent.locationX);
      },
    })
  ).current;

  const handleTouch = (touchX: number) => {
    const width = barLayoutRef.current.width || 1;
    const clampedX = Math.max(0, Math.min(width, touchX));
    const targetSeconds = (clampedX / width) * validDuration;
    onSeek(targetSeconds);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={styles.container}>
      {/* Time indicators */}
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>

      {/* Main Touch Bar Area */}
      <View
        style={styles.touchArea}
        onLayout={(e) => {
          barLayoutRef.current = {
            width: e.nativeEvent.layout.width,
            pageX: e.nativeEvent.layout.x,
          };
        }}
        {...panResponder.panHandlers}
      >
        {/* Track Background */}
        <View style={styles.trackBackground}>
          {/* Progress fill */}
          <View style={[styles.trackFill, { width: `${progressRatio * 100}%` }]} />
        </View>

        {/* AI Event Markers */}
        {events.map((evt) => {
          const markerRatio = Math.min(1, Math.max(0, evt.timeSeconds / validDuration));
          const isSelected = evt.id === selectedEventId;
          const strokeColor = STROKE_COLORS[evt.stroke] || '#38bdf8';

          return (
            <TouchableOpacity
              key={evt.id}
              hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
              style={[
                styles.marker,
                {
                  left: `${markerRatio * 100}%`,
                  backgroundColor: strokeColor,
                  transform: [{ translateX: -3 }, { scale: isSelected ? 1.5 : 1 }],
                  borderColor: isSelected ? '#ffffff' : 'transparent',
                  borderWidth: isSelected ? 1.5 : 0,
                },
              ]}
              onPress={() => {
                onSeek(evt.timeSeconds);
                onSelectEvent(evt);
              }}
            />
          );
        })}

        {/* Current Thumb Knob */}
        <View
          style={[
            styles.thumbKnob,
            {
              left: `${progressRatio * 100}%`,
            },
          ]}
          pointerEvents="none"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  timeText: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  touchArea: {
    height: 32,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  trackFill: {
    height: '100%',
    backgroundColor: '#0284c7',
  },
  marker: {
    position: 'absolute',
    width: 6,
    height: 12,
    borderRadius: 3,
    zIndex: 2,
  },
  thumbKnob: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    borderColor: '#0284c7',
    borderWidth: 2,
    transform: [{ translateX: -7 }],
    zIndex: 3,
  },
});

