import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window"); // Récupère les dimensions de l'écran

// Constantes pour les hauteurs des éléments UI
const HEADER_HEIGHT = 60; // Hauteur de votre header
const BOTTOM_TAB_HEIGHT = 60; // Hauteur de votre TabBar
const AVAILABLE_HEIGHT = height - HEADER_HEIGHT - BOTTOM_TAB_HEIGHT; // Hauteur disponible

const Question = ({ question, options, correctAnswerKey, onAnswer }) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const handleAnswer = (answerKey) => {
    setSelectedAnswer(answerKey);
    // Si onAnswer est fourni en prop, appelez-le avec la réponse sélectionnée
    if (onAnswer) {
      onAnswer(answerKey);
    }
  };

  // Détermine le style de l'option en fonction de la sélection
  const getOptionStyle = (key) => {
    if (!selectedAnswer) {
      return [styles.option, { backgroundColor: "#f0f4ff", borderColor: "#1927b6" }];
    }
    
    if (key === correctAnswerKey) {
      return [styles.option, { backgroundColor: "#e0f7e0", borderColor: "#4CAF50" }];
    }
    
    if (key === selectedAnswer && key !== correctAnswerKey) {
      return [styles.option, { backgroundColor: "#ffebee", borderColor: "#f44336" }];
    }
    
    return [styles.option, { backgroundColor: "#f0f4ff", borderColor: "#1927b6", opacity: 0.7 }];
  };

  return (
    <View style={styles.container}>
      <View style={styles.questionCard}>
        <Text style={styles.question}>{question}</Text>
        
        <View style={styles.optionsContainer}>
          {options.map(([key, value]) => (
            <TouchableOpacity
              key={key}
              style={getOptionStyle(key)}
              onPress={() => handleAnswer(key)}
              disabled={selectedAnswer !== null} // Désactive après réponse
              activeOpacity={0.8}
            >
              <Text style={styles.optionText}>{value}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {selectedAnswer && selectedAnswer !== correctAnswerKey && (
          <View style={styles.resultContainer}>
            <View style={styles.incorrectBadge}>
              <Text style={styles.resultText}>Incorrect 😕</Text>
            </View>
            <Text style={styles.correctAnswerText}>
              La bonne réponse était: {options.find(([key]) => key === correctAnswerKey)[1]}
            </Text>
          </View>
        )}
        
        {selectedAnswer && selectedAnswer === correctAnswerKey && (
          <View style={styles.resultContainer}>
            <View style={styles.correctBadge}>
              <Text style={styles.resultText}>Correct ✅</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: AVAILABLE_HEIGHT, // Utilise la hauteur disponible calculée
    width: width,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#1927b6", // Couleur de fond bleu
  },
  questionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    width: "100%",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  question: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
    color: "#333",
  },
  optionsContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  option: {
    width: "100%",
    padding: 16,
    marginVertical: 8,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  optionText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#333",
  },
  resultContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  correctBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 10,
  },
  incorrectBadge: {
    backgroundColor: "#f44336",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 10,
  },
  resultText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
  correctAnswerText: {
    color: "#333",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "500",
  },
});

export default Question;