import { Image, StyleSheet} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context"
import { ThemedView } from "@/components/ThemedView";

export default function SplashScreen() {
    return <SafeAreaProvider>
        <SafeAreaView>
            <ThemedView>
                <Image 
                    style={styles.container}
                    source={require('../../assets/images/lazonelogo.png')}
                    />
        </ThemedView>
        </SafeAreaView>
    </SafeAreaProvider>

}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        
    }
})