import React from 'react';
import { View, Image, StyleSheet, StatusBar, Platform } from 'react-native';

const AppHeader = () => {
  return (
    <View style={styles.headerContainer}>
      <StatusBar
        animated={true}
        backgroundColor="#ffffff"
        barStyle="default"
        showHideTransition="fade"
        hidden={false}
      />
      <View style={styles.innerContainer}>
        <Image
          source={require('../../assets/images/lazonelogoblack.png')}
          style={styles.lazonelogo}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: '15%',
    width: '100%',
    // backgroundColor: '#292829',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  innerContainer: {
    alignItems: 'center',
    width: '100%'
  },
  lazonelogo: {
    height: '100%',
    width: '50%', 
    resizeMode: 'contain',
    borderRadius: 20
  },
});

export default AppHeader;