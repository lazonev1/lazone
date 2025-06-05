import { Text, TextProps } from 'react-native';
import { Pressable, PressableProps, StyleSheet } from 'react-native'

type Props = TextProps & {
    label: String;
    onClick: () => void;
}

export default function ClickableText({ label, onClick, ...props }: Props) {
    return <Text style={styles.text}
        onPress={() => {
            onClick();
        }}
        {...props}>
        
        {label}
    </Text>
}

const styles = StyleSheet.create( {
    text: {
        color: '#fcbd02',
        fontSize: 14,
        textAlign: 'right'
    },
})