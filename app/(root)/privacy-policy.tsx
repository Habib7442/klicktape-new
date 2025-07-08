import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTheme } from "@/src/context/ThemeContext";

export default function PrivacyPolicyScreen() {
  const { colors, isDarkMode } = useTheme();

  // Helper function to open website links
  const openWebsite = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
  };

  // Helper function to open email
  const openEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`).catch(err => console.error('Failed to open email:', err));
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#000000' : '#FFFFFF' }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.header, {
          backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
          borderBottomColor: `${colors.primary}20`
        }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.headerIconButton, {
              backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
              borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.5)' : 'rgba(128, 128, 128, 0.3)'
            }]}
          >
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Privacy Policy
          </Text>
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              PRIVACY POLICY
            </Text>
            <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
              Last updated June 25, 2025
            </Text>
            
            <Text style={[styles.content, { color: colors.textSecondary }]}>
              This Privacy Notice for Klicktape Pvt Ltd ("we," "us," or "our") describes how and why we might access, collect, store, use, and/or share ("process") your personal information when you use our services ("Services"), including when you:
            </Text>
            
            <View style={styles.bulletContainer}>
              <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
                • Visit our website at{" "}
                <Text
                  style={[styles.link, { color: colors.primary }]}
                  onPress={() => openWebsite('https://www.klicktape.com')}
                >
                  https://www.klicktape.com
                </Text>
                {" "}or any website of ours that links to this Privacy Notice
              </Text>
            </View>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Download and use our mobile application (Klicktape), or any other application of ours that links to this Privacy Notice
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Use Social Media Application. Klicktape is a next-generation, privacy-focused social media platform that allows users to share stories, photos, reels, and connect with others, while keeping their personal data safe.
            </Text>
            
            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Unlike traditional social media apps, Klicktape does not use personalized ads or share your data with third-party advertisers. Instead, Klicktape uses contextual advertising, which displays ads based solely on the content being viewed, not on your browsing history, personal data, or behavior. This means you get relevant ads without sacrificing your privacy.
            </Text>
            
            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              Key features include:
            </Text>
            
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Anonymous Rooms for open, safe discussion
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Ad-free premium subscription for enhanced experience
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Shoppable content overlays
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Gamified engagement features to increase interaction
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • DMs, Stories, Reels, and Photo sharing, all designed with privacy-first principles
            </Text>
            
            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Klicktape offers a secure, transparent, and ethical alternative to conventional social networks. We believe in giving users full control over their data and digital experience.
            </Text>
            
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Engage with us in other related ways, including any sales, marketing, or events
            </Text>
            
            <View style={styles.contentContainer}>
              <Text style={[styles.content, { color: colors.textSecondary }]}>
                Questions or concerns? Reading this Privacy Notice will help you understand your privacy rights and choices. We are responsible for making decisions about how your personal information is processed. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at{" "}
                <Text
                  style={[styles.link, { color: colors.primary }]}
                  onPress={() => openEmail('director@klicktape.com')}
                >
                  director@klicktape.com
                </Text>
                .
              </Text>
            </View>
            
            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              SUMMARY OF KEY POINTS
            </Text>
            
            <Text style={[styles.content, { color: colors.textSecondary }]}>
              This summary provides key points from our Privacy Notice, but you can find out more details about any of these topics by using our table of contents below to find the section you are looking for.
            </Text>
            
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • What personal information do we process? When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us and the Services, the choices you make, and the products and features you use.
            </Text>
            
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Do we process any sensitive personal information? Some of the information may be considered "special" or "sensitive" in certain jurisdictions, for example your racial or ethnic origins, sexual orientation, and religious beliefs. We may process sensitive personal information when necessary with your consent or as otherwise permitted by applicable law.
            </Text>
            
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Do we collect any information from third parties? We do not collect any information from third parties.
            </Text>
            
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • How do we process your information? We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent.
            </Text>
            
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • In what situations and with which types of parties do we share personal information? We may share information in specific situations and with specific categories of third parties.
            </Text>
            
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • How do we keep your information safe? We have adequate organizational and technical processes and procedures in place to protect your personal information. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure.
            </Text>
            
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • What are your rights? Depending on where you are located geographically, the applicable privacy law may mean you have certain rights regarding your personal information.
            </Text>
            
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • How do you exercise your rights? The easiest way to exercise your rights is by submitting a data subject access request, or by contacting us. We will consider and act upon any request in accordance with applicable data protection laws.
            </Text>
            
            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Want to learn more about what we do with any information we collect? Review the Privacy Notice in full.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              TABLE OF CONTENTS
            </Text>

            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              1. WHAT INFORMATION DO WE COLLECT?
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              2. HOW DO WE PROCESS YOUR INFORMATION?
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              3. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              4. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              5. DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              6. HOW DO WE HANDLE YOUR SOCIAL LOGINS?
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              7. HOW LONG DO WE KEEP YOUR INFORMATION?
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              8. HOW DO WE KEEP YOUR INFORMATION SAFE?
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              9. WHAT ARE YOUR PRIVACY RIGHTS?
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              10. CONTROLS FOR DO-NOT-TRACK FEATURES
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              11. DO OTHER REGIONS HAVE SPECIFIC PRIVACY RIGHTS?
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              12. DO WE MAKE UPDATES TO THIS NOTICE?
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              13. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              14. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              1. WHAT INFORMATION DO WE COLLECT?
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Personal Information You Disclose to Us
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              In Short: We collect personal information that you provide to us.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Personal Information Provided by You. The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make, and the products and features you use. The personal information we collect may include the following:
            </Text>

            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • names
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • email addresses
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • mailing addresses
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • usernames
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • contact preferences
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • job titles
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • passwords
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              Sensitive Information
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              When necessary, with your consent or as otherwise permitted by applicable law, we process the following categories of sensitive information:
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Payment Data. We may collect data necessary to process your payment if you choose to make purchases, such as your payment instrument number, and the security code associated with your payment instrument. All payment data is handled and stored by our secure payment processors.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Social Media Login Data. We may provide you with the option to register with us using your existing social media account details, like your Facebook, X, or other social media account. If you choose to register in this way, we will collect certain profile information about you from the social media provider.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              Application Data
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              If you use our application(s), we also may collect the following information if you choose to provide us with access or permission:
            </Text>

            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Geolocation Information. We may request access or permission to track location-based information from your mobile device, either continuously or while you are using our mobile application(s), to provide certain location-based services.
            </Text>

            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Mobile Device Access. We may request access or permission to certain features from your mobile device, including your mobile device's camera, calendar, bluetooth, contacts, microphone, reminders, sms messages, social media accounts, storage, sensors, and other features.
            </Text>

            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Mobile Device Data. We automatically collect device information (such as your mobile device ID, model, and manufacturer), operating system, version information and system configuration information, device and application identification numbers, browser type and version, hardware model Internet service provider and/or mobile carrier, and Internet Protocol (IP) address.
            </Text>

            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Push Notifications. We may request to send you push notifications regarding your account or certain features of the application(s). If you wish to opt out from receiving these types of communications, you may turn them off in your device's settings.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              This information is primarily needed to maintain the security and operation of our application(s), for troubleshooting, and for our internal analytics and reporting purposes.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              All personal information that you provide to us must be true, complete, and accurate, and you must notify us of any changes to such personal information.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              Google API
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Our use of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              CONTACT US
            </Text>

            <View style={styles.contentContainer}>
              <Text style={[styles.content, { color: colors.textSecondary }]}>
                If you have any questions about this Privacy Policy, please contact us at{" "}
                <Text
                  style={[styles.link, { color: colors.primary }]}
                  onPress={() => openEmail('director@klicktape.com')}
                >
                  director@klicktape.com
                </Text>
                .
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerIconButton: {
    padding: 10,
    marginRight: 16,
    borderRadius: 50,
    borderWidth: 1.5,
  },
  title: {
    fontSize: 20,
    fontFamily: "Rubik-Bold",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: "Rubik-Bold",
    marginBottom: 8,
    textAlign: "center",
  },
  lastUpdated: {
    fontSize: 14,
    fontFamily: "Rubik-Regular",
    marginBottom: 20,
    textAlign: "center",
  },
  sectionSubtitle: {
    fontSize: 18,
    fontFamily: "Rubik-Bold",
    marginBottom: 12,
    marginTop: 16,
  },
  content: {
    fontSize: 14,
    fontFamily: "Rubik-Regular",
    lineHeight: 20,
    marginBottom: 12,
    textAlign: "justify",
  },
  bulletPoint: {
    fontSize: 14,
    fontFamily: "Rubik-Regular",
    lineHeight: 20,
    marginBottom: 6,
    marginLeft: 16,
  },
  bulletContainer: {
    marginBottom: 6,
  },
  contentContainer: {
    marginBottom: 12,
  },
  link: {
    textDecorationLine: 'underline',
    fontFamily: "Rubik-Medium",
  },
});
