import Checkbox, { CheckboxProps } from 'expo-checkbox';
import { StyleSheet } from 'react-native';

type Props = CheckboxProps & {
    isChecked: boolean;
    setChecked: () => void;
}

export default function CheckBox({isChecked, setChecked, ...props} : Props) {
    return <Checkbox
          style={styles.checkbox}
          value={isChecked}
          onValueChange={setChecked}
          color={isChecked ? '#171617' : undefined}
          {...props}            
        />

}

const styles = StyleSheet.create({
    checkbox: {
        margin: 8
    },
})