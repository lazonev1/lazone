import { View, Text } from 'react-native';
import React from 'react';
import { Button } from '@lazone/ui'; 

const App = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>LaZone App</Text>
      <Button label="Get Started" onPress={() => alert('Button works!')} />
    </View>
  );
};

export default App;

