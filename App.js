import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Speech from 'expo-speech';

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'A-Z', value: 'az' },
  { label: 'Z-A', value: 'za' },
];

export default function App() {
  const [task, setTask] = useState('');
  const [definition, setDefinition] = useState('');
  const [tasks, setTasks] = useState([]);
  const [trash, setTrash] = useState([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editTask, setEditTask] = useState('');
  const [editDefinition, setEditDefinition] = useState('');
  const [isEditTranslating, setIsEditTranslating] = useState(false);

  useEffect(() => {
    loadTasks();
    loadTrash();
  }, []);

  const loadTasks = async () => {
    try {
      const savedTasks = await AsyncStorage.getItem('tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadTrash = async () => {
    try {
      const savedTrash = await AsyncStorage.getItem('trash');
      if (savedTrash) {
        setTrash(JSON.parse(savedTrash));
      }
    } catch (error) {
      console.error('Error loading trash:', error);
    }
  };

  const saveTasks = async (newTasks) => {
    try {
      await AsyncStorage.setItem('tasks', JSON.stringify(newTasks));
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  };

  const saveTrash = async (newTrash) => {
    try {
      await AsyncStorage.setItem('trash', JSON.stringify(newTrash));
    } catch (error) {
      console.error('Error saving trash:', error);
    }
  };

  const translateToChinese = async () => {
    if (!task.trim()) return;
    setIsTranslating(true);
    try {
      const response = await axios.get('https://translate.googleapis.com/translate_a/single', {
        params: {
          client: 'gtx',
          sl: 'en',
          tl: 'yue-HK', // Cantonese
          dt: 't',
          q: task
        }
      });
      const translation = response.data[0][0][0];
      setDefinition(translation);
    } catch (error) {
      console.error('Translation error:', error);
      alert('Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const translateEditToChinese = async () => {
    if (!editTask.trim()) return;
    setIsEditTranslating(true);
    try {
      const response = await axios.get('https://translate.googleapis.com/translate_a/single', {
        params: {
          client: 'gtx',
          sl: 'en',
          tl: 'yue-HK',
          dt: 't',
          q: editTask
        }
      });
      const translation = response.data[0][0][0];
      setEditDefinition(translation);
    } catch (error) {
      console.error('Translation error:', error);
      alert('Translation failed. Please try again.');
    } finally {
      setIsEditTranslating(false);
    }
  };

  const speakText = async (text, language = 'en-US') => {
    try {
      setIsSpeaking(true);
      await Speech.speak(text, {
        language: language,
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false)
      });
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  };

  const addTask = () => {
    if (task.trim().length > 0) {
      const newTasks = [...tasks, { 
        id: Date.now().toString(), 
        text: task, 
        definition: definition.trim(),
        completed: false 
      }];
      setTasks(newTasks);
      saveTasks(newTasks);
      setTask('');
      setDefinition('');
      setShowAddModal(false);
    }
  };

  const startEditItem = (item) => {
    setEditItem(item);
    setEditTask(item.text);
    setEditDefinition(item.definition || '');
    setShowEditModal(true);
  };

  const saveEditItem = () => {
    if (!editItem) return;
    const newTasks = tasks.map(t =>
      t.id === editItem.id
        ? { ...t, text: editTask.trim(), definition: editDefinition.trim() }
        : t
    );
    setTasks(newTasks);
    saveTasks(newTasks);
    setShowEditModal(false);
    setEditItem(null);
    setEditTask('');
    setEditDefinition('');
  };

  const toggleTask = (id) => {
    const newTasks = tasks.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setTasks(newTasks);
    saveTasks(newTasks);
  };

  const deleteTask = (id) => {
    const itemToTrash = tasks.find(item => item.id === id);
    if (!itemToTrash) return;
    const newTasks = tasks.filter(item => item.id !== id);
    const newTrash = [itemToTrash, ...trash];
    setTasks(newTasks);
    setTrash(newTrash);
    saveTasks(newTasks);
    saveTrash(newTrash);
  };

  const restoreTask = (id) => {
    const itemToRestore = trash.find(item => item.id === id);
    if (!itemToRestore) return;
    const newTrash = trash.filter(item => item.id !== id);
    const newTasks = [...tasks, itemToRestore];
    setTrash(newTrash);
    setTasks(newTasks);
    saveTrash(newTrash);
    saveTasks(newTasks);
  };

  const permanentlyDeleteTask = (id) => {
    const newTrash = trash.filter(item => item.id !== id);
    setTrash(newTrash);
    saveTrash(newTrash);
  };

  // Sort and filter tasks
  const filteredTasks = tasks
    .filter(item => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        item.text.toLowerCase().includes(q) ||
        (item.definition && item.definition.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.id.localeCompare(a.id);
      if (sortBy === 'oldest') return a.id.localeCompare(b.id);
      if (sortBy === 'az') return a.text.localeCompare(b.text);
      if (sortBy === 'za') return b.text.localeCompare(a.text);
      return 0;
    });

  // Cycle through sort options
  const handleSortPress = () => {
    const idx = SORT_OPTIONS.findIndex(opt => opt.value === sortBy);
    const nextIdx = (idx + 1) % SORT_OPTIONS.length;
    setSortBy(SORT_OPTIONS[nextIdx].value);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Translator Checklist</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.addItemButton} onPress={() => setShowAddModal(true)}>
            <Text style={styles.addItemButtonText}>+ Add Item</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.trashButton} onPress={() => setShowTrash(true)}>
            <Text style={styles.trashButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Search and Sort Bar */}
      <View style={styles.searchSortRow}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search..."
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        <TouchableOpacity style={styles.sortButton} onPress={handleSortPress}>
          <Text style={styles.sortButtonText}>Sort: {SORT_OPTIONS.find(opt => opt.value === sortBy).label}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.taskContainer}>
            <TouchableOpacity
              style={styles.task}
              onPress={() => toggleTask(item.id)}
            >
              <View style={[styles.checkbox, item.completed && styles.checked]} />
              <View style={styles.taskContent}>
                <View style={styles.taskRow}>
                  <Text style={[styles.taskText, item.completed && styles.completedText]}>
                    {item.text}
                  </Text>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => startEditItem(item)}
                  >
                    <Text style={styles.editButtonText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.speakButton}
                    onPress={() => speakText(item.text)}
                    disabled={isSpeaking}
                  >
                    <Text style={styles.speakButtonText}>🔊</Text>
                  </TouchableOpacity>
                </View>
                {item.definition ? (
                  <View style={styles.taskRow}>
                    <Text style={[styles.definitionText, item.completed && styles.completedText]}>
                      {item.definition}
                    </Text>
                    <TouchableOpacity
                      style={styles.speakButton}
                      onPress={() => speakText(item.definition, 'yue-HK')}
                      disabled={isSpeaking}
                    >
                      <Text style={styles.speakButtonText}>🔊</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteTask(item.id)}
            >
              <Text style={styles.deleteButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      {/* Add Item Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.addModalContainer}
        >
          <View style={styles.addModalHeader}>
            <Text style={styles.addModalTitle}>Add New Item</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.closeAddModalText}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Add a new task"
              value={task}
              onChangeText={setTask}
            />
            <View style={styles.definitionContainer}>
              <TextInput
                style={[styles.input, styles.definitionInput]}
                placeholder="Add definition"
                value={definition}
                onChangeText={setDefinition}
              />
              <TouchableOpacity 
                style={styles.translateButton}
                onPress={translateToChinese}
                disabled={isTranslating || !task.trim()}
              >
                {isTranslating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.translateButtonText}>粵</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={addTask}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
      {/* Edit Item Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.addModalContainer}
        >
          <View style={styles.addModalHeader}>
            <Text style={styles.addModalTitle}>Edit Item</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.closeAddModalText}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Edit task"
              value={editTask}
              onChangeText={setEditTask}
            />
            <View style={styles.definitionContainer}>
              <TextInput
                style={[styles.input, styles.definitionInput]}
                placeholder="Edit definition"
                value={editDefinition}
                onChangeText={setEditDefinition}
              />
              <TouchableOpacity 
                style={styles.translateButton}
                onPress={translateEditToChinese}
                disabled={isEditTranslating || !editTask.trim()}
              >
                {isEditTranslating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.translateButtonText}>粵</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={saveEditItem}>
            <Text style={styles.addButtonText}>Save</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
      {/* Trash Bin Modal */}
      <Modal
        visible={showTrash}
        animationType="slide"
        onRequestClose={() => setShowTrash(false)}
      >
        <View style={styles.trashContainer}>
          <View style={styles.trashHeader}>
            <Text style={styles.trashTitle}>Trash Bin</Text>
            <TouchableOpacity onPress={() => setShowTrash(false)}>
              <Text style={styles.closeTrashText}>Close</Text>
            </TouchableOpacity>
          </View>
          {trash.length === 0 ? (
            <Text style={styles.emptyTrashText}>Trash is empty.</Text>
          ) : (
            <FlatList
              data={trash}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.trashItemContainer}>
                  <View style={styles.trashItemContent}>
                    <Text style={styles.trashItemText}>{item.text}</Text>
                    {item.definition ? (
                      <Text style={styles.trashItemDefinition}>{item.definition}</Text>
                    ) : null}
                  </View>
                  <View style={styles.trashActions}>
                    <TouchableOpacity style={styles.restoreButton} onPress={() => restoreTask(item.id)}>
                      <Text style={styles.restoreButtonText}>Restore</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.permanentDeleteButton} onPress={() => permanentlyDeleteTask(item.id)}>
                      <Text style={styles.permanentDeleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addItemButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  addItemButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  trashButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  trashButtonText: {
    fontSize: 22,
  },
  searchSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchBar: {
    flex: 1,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    marginRight: 10,
  },
  sortButton: {
    backgroundColor: '#eee',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  sortButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 15,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    marginBottom: 10,
  },
  input: {
    height: 40,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  definitionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  definitionInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 10,
  },
  translateButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  translateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  addModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    justifyContent: 'flex-start',
  },
  addModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  addModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  closeAddModalText: {
    color: '#007AFF',
    fontSize: 16,
  },
  taskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  task: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  taskContent: {
    flex: 1,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 10,
    marginTop: 2,
  },
  checked: {
    backgroundColor: '#007AFF',
  },
  taskText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  definitionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    flex: 1,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  speakButton: {
    padding: 5,
    marginLeft: 10,
  },
  speakButtonText: {
    fontSize: 20,
  },
  editButton: {
    padding: 5,
    marginLeft: 10,
  },
  editButtonText: {
    fontSize: 18,
  },
  deleteButton: {
    padding: 5,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 24,
    fontWeight: 'bold',
  },
  // Trash Bin Styles
  trashContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
  },
  trashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  trashTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  closeTrashText: {
    color: '#007AFF',
    fontSize: 16,
  },
  emptyTrashText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
    fontSize: 16,
  },
  trashItemContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trashItemContent: {
    flex: 1,
  },
  trashItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  trashItemDefinition: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  trashActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  restoreButton: {
    backgroundColor: '#4CD964',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  restoreButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  permanentDeleteButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  permanentDeleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 