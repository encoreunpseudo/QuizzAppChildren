import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Import des écrans
import FeedScreen from './screens/Feed';
import ProfileScreen from './screens/Profile';
import RevisionScreen from './screens/RevisionScreen';
import RevisionQuizScreen from './screens/RevisionQuizScreen';


const Tab = createBottomTabNavigator();

// Utilisation d'une fonction pour la navigation entre écrans sans Stack Navigator
const getScreenComponent = (screen, params) => {
  switch(screen) {
    case 'RevisionQuiz':
      return props => <RevisionQuizScreen {...props} route={{ params }} />;
    default:
      return RevisionScreen;
  }
};

// Composant personnalisé pour la TabBar
const CustomTabBar = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          // Déterminer l'icône à afficher
          let iconName;
          if (route.name === 'Feed') {
            iconName = isFocused ? 'flash' : 'flash-outline';
          } else if (route.name === 'Revision') {
            iconName = isFocused ? 'book' : 'book-outline';
          
          } else if (route.name === 'Profile') {
            iconName = isFocused ? 'person' : 'person-outline';
          }

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={[
                styles.tabItem,
                isFocused && styles.tabItemActive
              ]}
            >
              <Ionicons 
                name={iconName} 
                size={24} 
                color={isFocused ? '#ffffff' : 'rgba(255,255,255,0.6)'} 
              />
              <Text style={[
                styles.tabLabel,
                isFocused ? styles.tabLabelActive : styles.tabLabelInactive
              ]}>
                {label === 'Feed' ? 'Découvrir' : 
                 label === 'Revision' ? 'Réviser' : 
                 

                 label === 'Profile' ? 'Profil' : label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBarStyle
        }}
      >
        <Tab.Screen 
          name="Feed" 
          component={FeedScreen}
          options={{
            tabBarLabel: 'Découvrir'
          }}
        />
        <Tab.Screen 
          name="Revision" 
          component={RevisionScreen}
          options={{
            tabBarLabel: 'Réviser'
          }}
        />
        
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Profil'
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'transparent',
    paddingHorizontal: 15,
    paddingBottom: 15
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1621a0',
    borderRadius: 30,
    height: 65,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
    margin: 5,
  },
  tabItemActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 3,
  },
  tabLabelActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  tabLabelInactive: {
    color: 'rgba(255,255,255,0.6)',
  },
  tabBarStyle: {
    display: 'none'
  }
});