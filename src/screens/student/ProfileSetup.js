import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, StatusBar, ActivityIndicator, Image, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { TextInput } from 'react-native-paper';
import { uploadProfilePicture, updateStudent, addStudent } from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const FONTS = {
  black: 'Outfit_900Black',
  bold: 'Outfit_700Bold',
  semi: 'Outfit_600SemiBold',
  body: 'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold',
};

export default function ProfileSetup() {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute();
  
  const initialStudentData = route.params?.studentData || {};

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localImage, setLocalImage] = useState(null);
  
  const [form, setForm] = useState({
    id: initialStudentData.id,
    name: initialStudentData.name || '',
    phone: initialStudentData.phone || '',
    gender: initialStudentData.gender || 'Male',
    avatar_url: initialStudentData.avatar_url || null,
  });

  useEffect(() => {
    const fetchId = async () => {
      if (!form.id) {
        const storedStr = await AsyncStorage.getItem('studentData');
        if (storedStr) {
          const stored = JSON.parse(storedStr);
          if (stored.id) setForm(prev => ({ ...prev, id: stored.id }));
        }
      }
    };
    fetchId();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }
    
    let result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true, 
      aspect: [1, 1], 
      quality: 0.5 
    });
    
    if (!result.canceled) {
      if (form.id) {
        setUploading(true);
        const { data: url, error } = await uploadProfilePicture(form.id, result.assets[0].uri);
        setUploading(false);
        if (!error && url) {
          setForm({ ...form, avatar_url: url });
        } else {
          alert('Failed to upload image. Please try again.');
        }
      } else {
        setLocalImage(result.assets[0].uri);
      }
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      alert('Please fill out your name and phone number.');
      return;
    }

    setLoading(true);
    
    if (form.id) {
      const { error } = await updateStudent(form.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        avatar_url: form.avatar_url
      });
      
      if (!error) {
        const storedStr = await AsyncStorage.getItem('studentData');
        if (storedStr) {
          const stored = JSON.parse(storedStr);
          await AsyncStorage.setItem('studentData', JSON.stringify({
            ...stored,
            name: form.name.trim(),
            phone: form.phone.trim(),
            gender: form.gender,
            avatar_url: form.avatar_url
          }));
        }
      } else {
        console.error(error);
      }
    } else {
      const newStudentData = {
        email: initialStudentData.email,
        name: form.name.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        status: 'active',
        license_type: 'LMV',
        total_days: 20,
        joining_date: new Date().toISOString()
      };
      
      const { data, error } = await addStudent(newStudentData);
      
      if (!error && data && data.length > 0) {
        const newId = data[0].id;
        let finalAvatarUrl = null;
        
        if (localImage) {
          const { data: url } = await uploadProfilePicture(newId, localImage);
          if (url) {
            await updateStudent(newId, { avatar_url: url });
            finalAvatarUrl = url;
          }
        }
        
        await AsyncStorage.setItem('studentData', JSON.stringify({
          ...newStudentData,
          id: newId,
          avatar_url: finalAvatarUrl
        }));
      } else {
        console.error(error);
        alert('Failed to create your profile.');
        setLoading(false);
        return;
      }
    }
    
    setLoading(false);
    navigation.replace('StudentTabs');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <LinearGradient colors={[colors.primaryDark, colors.primary]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <Text style={styles.headerTitle}>Complete Profile</Text>
          <Text style={styles.headerSub}>Let's get to know you better</Text>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          <View style={[styles.card, { backgroundColor: colors.white, shadowColor: colors.primaryDark }]}>
            
            {/* Avatar Upload */}
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={pickImage} style={styles.avatarWrap} disabled={uploading}>
                <View style={[styles.avatar, { borderColor: colors.primary + '20' }]}>
                  {uploading ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                  ) : localImage ? (
                    <Image source={{ uri: localImage }} style={styles.avatarImg} />
                  ) : form.avatar_url ? (
                    <Image source={{ uri: form.avatar_url }} style={styles.avatarImg} />
                  ) : (
                    <Ionicons name="person" size={50} color={colors.primary + '40'} />
                  )}
                  <View style={[styles.editBadge, { backgroundColor: colors.accent, borderColor: colors.white }]}>
                    <Ionicons name="camera" size={14} color={colors.primaryDeep || '#050B18'} />
                  </View>
                </View>
              </TouchableOpacity>
              <Text style={[styles.avatarLabel, { color: colors.text }]}>Upload Photo</Text>
            </View>

            {/* Form Fields */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
              <TextInput
                value={form.name}
                onChangeText={(text) => setForm({ ...form, name: text })}
                mode="outlined"
                style={[styles.input, { backgroundColor: colors.bg }]}
                outlineColor="transparent"
                activeOutlineColor={colors.primary}
                textColor={colors.text}
                left={<TextInput.Icon icon={() => <Ionicons name="person-outline" size={20} color={colors.primary} />} />}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
              <TextInput
                value={form.phone}
                onChangeText={(text) => setForm({ ...form, phone: text })}
                mode="outlined"
                keyboardType="phone-pad"
                style={[styles.input, { backgroundColor: colors.bg }]}
                outlineColor="transparent"
                activeOutlineColor={colors.primary}
                textColor={colors.text}
                left={<TextInput.Icon icon={() => <Ionicons name="call-outline" size={20} color={colors.primary} />} />}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Gender</Text>
              <View style={styles.genderRow}>
                {['Male', 'Female', 'Other'].map((g) => {
                  const isSelected = form.gender === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderBtn,
                        { borderColor: isSelected ? colors.primary : '#E2E8F0' },
                        isSelected && { backgroundColor: colors.primary + '10' }
                      ]}
                      onPress={() => setForm({ ...form, gender: g })}
                    >
                      <View style={[styles.radioOuter, { borderColor: isSelected ? colors.primary : '#94A3B8' }]}>
                        {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                      </View>
                      <Text style={[styles.genderText, { color: isSelected ? colors.primary : '#64748B' }]}>{g}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

          </View>
          
          <TouchableOpacity 
            style={[styles.saveBtnWrap, { shadowColor: colors.accent }]} 
            onPress={handleSave} 
            disabled={loading}
          >
            <LinearGradient colors={[colors.accent, colors.accent]} style={styles.saveBtn}>
              {loading ? (
                <ActivityIndicator color={colors.primaryDeep || '#050B18'} />
              ) : (
                <Text style={[styles.saveBtnTxt, { color: colors.primaryDeep || '#050B18' }]}>Save & Continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 50,
    paddingBottom: 90,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: FONTS.black,
    color: '#FFFFFF',
    marginTop: 10,
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 15,
    fontFamily: FONTS.bodySemi,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  scroll: {
    paddingHorizontal: 25,
    paddingTop: 10,
    paddingBottom: 50,
  },
  card: {
    marginTop: -50,
    borderRadius: 32,
    padding: 30,
    elevation: 12,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    marginBottom: 30,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 35,
    marginTop: -20,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  avatarLabel: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    marginTop: 4,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontFamily: FONTS.black,
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 16,
    fontFamily: FONTS.semi,
    borderRadius: 16,
    overflow: 'hidden',
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1.5,
    borderRadius: 12,
  },
  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  genderText: {
    fontSize: 13,
    fontFamily: FONTS.semi,
  },
  saveBtnWrap: {
    borderRadius: 16,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  saveBtn: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnTxt: {
    fontSize: 16,
    fontFamily: FONTS.black,
    letterSpacing: 0.5,
  },
});
