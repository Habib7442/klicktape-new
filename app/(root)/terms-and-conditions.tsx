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

export default function TermsAndConditionsScreen() {
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
            Terms and Conditions
          </Text>
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              TERMS OF USE
            </Text>
            <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
              Last updated June 16, 2025
            </Text>
            
            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              AGREEMENT TO OUR LEGAL TERMS
            </Text>
            
            <Text style={[styles.content, { color: colors.textSecondary }]}>
              We are Klicktape ('Company', 'we', 'us', or 'our'), a company registered in India at Tarunodoy Road, Silchar, Assam 788123.
            </Text>
            
            <View style={styles.contentContainer}>
              <Text style={[styles.content, { color: colors.textSecondary }]}>
                We operate the website{" "}
                <Text
                  style={[styles.link, { color: colors.primary }]}
                  onPress={() => openWebsite('https://www.klicktape.com')}
                >
                  https://www.klicktape.com
                </Text>
                {" "}(the 'Site'), the mobile application Klicktape (the 'App'), as well as any other related products and services that refer or link to these legal terms (the 'Legal Terms') (collectively, the 'Services').
              </Text>
            </View>
            
            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Klicktape is a privacy-first social media platform where users can share stories, photos, reels, and connect securely. Unlike traditional apps, Klicktape avoids personalized ads and third-party data sharing, using contextual advertising based on viewed content to protect user privacy.
            </Text>
            
            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              Key Features:
            </Text>
            
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Anonymous Rooms for safe discussions
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Ad-free premium subscription
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Shoppable content overlays
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Gamified engagement features
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Privacy-focused DMs, Stories, Reels, and Photo sharing
            </Text>
            
            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Klicktape offers a secure, transparent alternative to conventional social networks, empowering users with full data control.
            </Text>
            
            <View style={styles.contentContainer}>
              <Text style={[styles.content, { color: colors.textSecondary }]}>
                You can contact us by phone at 9678011096, email at{" "}
                <Text
                  style={[styles.link, { color: colors.primary }]}
                  onPress={() => openEmail('director@klicktape.com')}
                >
                  director@klicktape.com
                </Text>
                , or by mail to Tarunodoy Road, Silchar, Assam 788123, India.
              </Text>
            </View>
            
            <Text style={[styles.content, { color: colors.textSecondary }]}>
              These Legal Terms constitute a legally binding agreement made between you, whether personally or on behalf of an entity ('you'), and Klicktape, concerning your access to and use of the Services. You agree that by accessing the Services, you have read, understood, and agreed to be bound by all of these Legal Terms. IF YOU DO NOT AGREE WITH ALL OF THESE LEGAL TERMS, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SERVICES AND YOU MUST DISCONTINUE USE IMMEDIATELY.
            </Text>
            
            <View style={styles.contentContainer}>
              <Text style={[styles.content, { color: colors.textSecondary }]}>
                We will provide you with prior notice of any scheduled changes to the Services you are using. The modified Legal Terms will become effective upon posting or notifying you by{" "}
                <Text
                  style={[styles.link, { color: colors.primary }]}
                  onPress={() => openEmail('director@klicktape.com')}
                >
                  director@klicktape.com
                </Text>
                , as stated in the email message. By continuing to use the Services after the effective date of any changes, you agree to be bound by the modified terms.
              </Text>
            </View>
            
            <Text style={[styles.content, { color: colors.textSecondary }]}>
              The Services are intended for users who are at least 13 years of age. All users who are minors in the jurisdiction in which they reside (generally under the age of 18) must have the permission of, and be directly supervised by, their parent or guardian to use the Services. If you are a minor, you must have your parent or guardian read and agree to these Legal Terms prior to you using the Services.
            </Text>
            
            <Text style={[styles.content, { color: colors.textSecondary }]}>
              We recommend that you print a copy of these Legal Terms for your records.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              TABLE OF CONTENTS
            </Text>

            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              1. OUR SERVICES
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              2. INTELLECTUAL PROPERTY RIGHTS
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              3. USER REPRESENTATIONS
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              4. USER REGISTRATION
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              5. PRODUCTS
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              6. PURCHASES AND PAYMENT
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              7. SUBSCRIPTIONS
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              8. RETURN/REFUNDS POLICY
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              9. SOFTWARE
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              10. PROHIBITED ACTIVITIES
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              11. USER GENERATED CONTRIBUTIONS
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              12. CONTRIBUTION LICENCE
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              13. MOBILE APPLICATION LICENCE
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              14. SOCIAL MEDIA
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              15. THIRD-PARTY WEBSITES AND CONTENT
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              16. SERVICES MANAGEMENT
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              17. DIGITAL MILLENNIUM COPYRIGHT ACT (DMCA) NOTICE AND POLICY
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              18. TERM AND TERMINATION
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              19. MODIFICATIONS AND INTERRUPTIONS
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              20. GOVERNING LAW
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              21. DISPUTE RESOLUTION
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              22. CORRECTIONS
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              23. DISCLAIMER
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              24. LIMITATIONS OF LIABILITY
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              25. INDEMNIFICATION
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              26. USER DATA
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              27. ELECTRONIC COMMUNICATIONS, TRANSACTIONS, AND SIGNATURES
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              28. CALIFORNIA USERS AND RESIDENTS
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              29. MISCELLANEOUS
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              30. CONTACT US
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              1. OUR SERVICES
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              The information provided when using the Services is not intended for distribution to or use by any person or entity in any jurisdiction or country where such distribution or use would be contrary to law or regulation or which would subject us to any registration requirement within such jurisdiction or country. Accordingly, those persons who choose to access the Services from other locations do so on their own initiative and are solely responsible for compliance with local laws, if and to the extent local laws are applicable.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              2. INTELLECTUAL PROPERTY RIGHTS
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Our intellectual property: We are the owner or the licensee of all intellectual property rights in our Services, including all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics in the Services (collectively, the 'Content'), as well as the trademarks, service marks, and logos contained therein (the 'Marks').
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Our Content and Marks are protected by copyright and trademark laws (and various other intellectual property rights and unfair competition laws) and treaties in the United States and around the world.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              The Content and Marks are provided in or through the Services 'AS IS' for your personal, non-commercial use or internal business purpose only.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              Your use of our Services
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Subject to your compliance with these Legal Terms, including the 'PROHIBITED ACTIVITIES' section below, we grant you a non-exclusive, non-transferable, revocable licence to:
            </Text>

            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • access the Services; and
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • download or print a copy of any portion of the Content to which you have properly gained access,
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              solely for your personal, non-commercial use or internal business purpose.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Except as set out in this section or elsewhere in our Legal Terms, no part of the Services and no Content or Marks may be copied, reproduced, aggregated, republished, uploaded, posted, publicly displayed, encoded, translated, transmitted, distributed, sold, licensed, or otherwise exploited for any commercial purpose whatsoever, without our express prior written permission.
            </Text>

            <View style={styles.contentContainer}>
              <Text style={[styles.content, { color: colors.textSecondary }]}>
                If you wish to make any use of the Services, Content, or Marks other than as set out in this section or elsewhere in our Legal Terms, please address your request to:{" "}
                <Text
                  style={[styles.link, { color: colors.primary }]}
                  onPress={() => openEmail('director@klicktape.com')}
                >
                  director@klicktape.com
                </Text>
                . If we ever grant you the permission to post, reproduce, or publicly display any part of our Services or Content, you must identify us as the owners or licensors of the Services, Content, or Marks and ensure that any copyright or proprietary notice appears or is visible on posting, reproducing, or displaying our Content.
              </Text>
            </View>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              We reserve all rights not expressly granted to you in and to the Services, Content, and Marks.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Any breach of these Intellectual Property Rights will constitute a material breach of our Legal Terms and your right to use our Services will terminate immediately.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              Your submissions and contributions
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Please review this section and the 'PROHIBITED ACTIVITIES' section carefully prior to using our Services to understand the (a) rights you give us and (b) obligations you have when you post or upload any content through the Services.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Submissions: By directly sending us any question, comment, suggestion, idea, feedback, or other information about the Services ('Submissions'), you agree to assign to us all intellectual property rights in such Submission. You agree that we shall own this Submission and be entitled to its unrestricted use and dissemination for any lawful purpose, commercial or otherwise, without acknowledgment or compensation to you.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Contributions: The Services may invite you to chat, contribute to, or participate in blogs, message boards, online forums, and other functionality during which you may create, submit, post, display, transmit, publish, distribute, or broadcast content and materials to us or through the Services, including but not limited to text, writings, video, audio, photographs, music, graphics, comments, reviews, rating suggestions, personal information, or other material ('Contributions'). Any Submission that is publicly posted shall also be treated as a Contribution.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              You understand that Contributions may be viewable by other users of the Services and possibly through third-party websites.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              3. USER REPRESENTATIONS
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              By using the Services, you represent and warrant that:
            </Text>

            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (1) all registration information you submit will be true, accurate, current, and complete;
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (2) you will maintain the accuracy of such information and promptly update such registration information as necessary;
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (3) you have the legal capacity and you agree to comply with these Legal Terms;
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (4) you are not under the age of 13;
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (5) you are not a minor in the jurisdiction in which you reside, or if a minor, you have received parental permission to use the Services;
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (6) you will not access the Services through automated or non-human means, whether through a bot, script or otherwise;
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (7) you will not use the Services for any illegal or unauthorised purpose; and
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (8) your use of the Services will not violate any applicable law or regulation.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              If you provide any information that is untrue, inaccurate, not current, or incomplete, we have the right to suspend or terminate your account and refuse any and all current or future use of the Services (or any portion thereof).
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              4. USER REGISTRATION
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              You may be required to register to use the Services. You agree to keep your password confidential and will be responsible for all use of your account and password. We reserve the right to remove, reclaim, or change a username you select if we determine, in our sole discretion, that such username is inappropriate, obscene, or otherwise objectionable.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              5. PRODUCTS
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              We make every effort to display as accurately as possible the colours, features, specifications, and details of the products available on the Services. However, we do not guarantee that the colours, features, specifications, and details of the products will be accurate, complete, reliable, current, or free of other errors, and your electronic display may not accurately reflect the actual colours and details of the products. All products are subject to availability, and we cannot guarantee that items will be in stock. We reserve the right to discontinue any products at any time for any reason. Prices for all products are subject to change.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              6. PURCHASES AND PAYMENT
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              We accept the following forms of payment:
            </Text>

            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Visa
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Mastercard
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • PayPal
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • American Express
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Discover
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Unified Payments Interface
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              You agree to provide current, complete, and accurate purchase and account information for all purchases made via the Services. You further agree to promptly update account and payment information, including email address, payment method, and payment card expiration date, so that we can complete your transactions and contact you as needed. Sales tax will be added to the price of purchases as deemed required by us. We may change prices at any time. All payments shall be in Rupees.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              You agree to pay all charges at the prices then in effect for your purchases and any applicable shipping fees, and you authorise us to charge your chosen payment provider for any such amounts upon placing your order. We reserve the right to correct any errors or mistakes in pricing, even if we have already requested or received payment.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              We reserve the right to refuse any order placed through the Services. We may, in our sole discretion, limit or cancel quantities purchased per person, per household, or per order. These restrictions may include orders placed by or under the same customer account, the same payment method, and/or orders that use the same billing or shipping address. We reserve the right to limit or prohibit orders that, in our sole judgement, appear to be placed by dealers, resellers, or distributors.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              7. SUBSCRIPTIONS
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              Billing and Renewal
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Your subscription will continue and automatically renew unless cancelled. You consent to our charging your payment method on a recurring basis without requiring your prior approval for each recurring charge, until such time as you cancel the applicable order. The length of your billing cycle will depend on the type of subscription plan you choose when you subscribed to the Services.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              Free Trial
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              We offer a 30-day free trial to new users who register with the Services. The account will be charged according to the user's chosen subscription at the end of the free trial.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              Cancellation
            </Text>

            <View style={styles.contentContainer}>
              <Text style={[styles.content, { color: colors.textSecondary }]}>
                You can cancel your subscription at any time by logging into your account. Your cancellation will take effect at the end of the current paid term. If you have any questions or are unsatisfied with our Services, please email us at{" "}
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
              Fee Changes
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              We may, from time to time, make changes to the subscription fee and will communicate any price changes to you in accordance with applicable law.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              8. RETURN/REFUNDS POLICY
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              All sales are final and no refund will be issued.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              9. SOFTWARE
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              We may include software for use in connection with our Services. If such software is accompanied by an end user licence agreement ('EULA'), the terms of the EULA will govern your use of the software. If such software is not accompanied by a EULA, then we grant to you a non-exclusive, revocable, personal, and non-transferable licence to use such software solely in connection with our services and in accordance with these Legal Terms. Any software and any related documentation is provided 'AS IS' without warranty of any kind, either express or implied, including, without limitation, the implied warranties of merchantability, fitness for a particular purpose, or non-infringement. You accept any and all risk arising out of use or performance of any software. You may not reproduce or redistribute any software except in accordance with the EULA or these Legal Terms.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              10. PROHIBITED ACTIVITIES
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              You may not access or use the Services for any purpose other than that for which we make the Services available. The Services may not be used in connection with any commercial endeavours except those that are specifically endorsed or approved by us.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              As a user of the Services, you agree not to:
            </Text>

            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Systematically retrieve data or other content from the Services to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Trick, defraud, or mislead us and other users, especially in any attempt to learn sensitive account information such as user passwords.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Circumvent, disable, or otherwise interfere with security-related features of the Services, including features that prevent or restrict the use or copying of any Content or enforce limitations on the use of the Services and/or the Content contained therein.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Disparage, tarnish, or otherwise harm, in our opinion, us and/or the Services.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Use any information obtained from the Services in order to harass, abuse, or harm another person.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Make improper use of our support services or submit false reports of abuse or misconduct.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Use the Services in a manner inconsistent with any applicable laws or regulations.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Engage in unauthorised framing of or linking to the Services.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Upload or transmit (or attempt to upload or to transmit) viruses, Trojan horses, or other material, including excessive use of capital letters and spamming (continuous posting of repetitive text), that interferes with any party's uninterrupted use and enjoyment of the Services or modifies, impairs, disrupts, alters, or interferes with the use, features, functions, operation, or maintenance of the Services.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Engage in any automated use of the system, such as using scripts to send comments or messages, or using any data mining, robots, or similar data gathering and extraction tools.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Delete the copyright or other proprietary rights notice from any Content.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Attempt to impersonate another user or person or use the username of another user.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Upload or transmit (or attempt to upload or to transmit) any material that acts as a passive or active information collection or transmission mechanism, including without limitation, clear graphics interchange formats ('gifs'), 1×1 pixels, web bugs, cookies, or other similar devices (sometimes referred to as 'spyware' or 'passive collection mechanisms' or 'pcms').
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Interfere with, disrupt, or create an undue burden on the Services or the networks or services connected to the Services.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Harass, annoy, intimidate, or threaten any of our employees or agents engaged in providing any portion of the Services to you.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Attempt to bypass any measures of the Services designed to prevent or restrict access to the Services, or any portion of the Services.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Copy or adapt the Services' software, including but not limited to Flash, PHP, HTML, JavaScript, or other code.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Except as permitted by applicable law, decipher, decompile, disassemble, or reverse engineer any of the software comprising or in any way making up a part of the Services.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Except as may be the result of standard search engine or Internet browser usage, use, launch, develop, or distribute any automated system, including without limitation, any spider, robot, cheat utility, scraper, or offline reader that accesses the Services, or use or launch any unauthorised script or other software.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Use a buying agent or purchasing agent to make purchases on the Services.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Make any unauthorised use of the Services, including collecting usernames and/or email addresses of users by electronic or other means for the purpose of sending unsolicited email, or creating user accounts by automated means or under false pretences.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Use the Services as part of any effort to compete with us or otherwise use the Services and/or the Content for any revenue-generating endeavour or commercial enterprise.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Use the Services to advertise or offer to sell goods and services.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              11. USER GENERATED CONTRIBUTIONS
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              The Services may invite you to chat, contribute to, or participate in blogs, message boards, online forums, and other functionality, and may provide you with the opportunity to create, submit, post, display, transmit, perform, publish, distribute, or broadcast content and materials to us or on the Services, including but not limited to text, writings, video, audio, photographs, graphics, comments, suggestions, or personal information or other material (collectively, 'Contributions'). Contributions may be viewable by other users of the Services and through third-party websites. As such, any Contributions you transmit may be treated as non-confidential and non-proprietary. When you create or make available any Contributions, you thereby represent and warrant that:
            </Text>

            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • The creation, distribution, transmission, public display, or performance, and the accessing, downloading, or copying of your Contributions do not and will not infringe the proprietary rights, including but not limited to the copyright, patent, trademark, trade secret, or moral rights of any third party.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • You are the creator and owner of or have the necessary licences, rights, consents, releases, and permissions to use and to authorise us, the Services, and other users of the Services to use your Contributions in any manner contemplated by the Services and these Legal Terms.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • You have the written consent, release, and/or permission of each and every identifiable individual person in your Contributions to use the name or likeness of each and every such identifiable individual person to enable inclusion and use of your Contributions in any manner contemplated by the Services and these Legal Terms.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Your Contributions are not false, inaccurate, or misleading.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Your Contributions are not unsolicited or unauthorised advertising, promotional materials, pyramid schemes, chain letters, spam, mass mailings, or other forms of solicitation.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Your Contributions are not obscene, lewd, lascivious, filthy, violent, harassing, libellous, slanderous, or otherwise objectionable (as determined by us).
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Your Contributions do not ridicule, mock, disparage, intimidate, or abuse anyone.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Your Contributions are not used to harass or threaten (in the legal sense of those terms) any other person and to promote violence against a specific person or class of people.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Your Contributions do not violate any applicable law, regulation, or rule.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Your Contributions do not violate the privacy or publicity rights of any third party.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Your Contributions do not violate any applicable law concerning child pornography, or otherwise intended to protect the health or well-being of minors.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Your Contributions do not include any offensive comments that are connected to race, national origin, gender, sexual preference, or physical handicap.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Your Contributions do not otherwise violate, or link to material that violates, any provision of these Legal Terms, or any applicable law or regulation.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Any use of the Services in violation of the foregoing violates these Legal Terms and may result in, among other things, termination or suspension of your rights to use the Services.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              12. CONTRIBUTION LICENCE
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              By posting your Contributions to any part of the Services or making Contributions accessible to the Services by linking your account from the Services to any of your social networking accounts, you automatically grant, and you represent and warrant that you have the right to grant, to us an unrestricted, unlimited, irrevocable, perpetual, non-exclusive, transferable, royalty-free, fully-paid, worldwide right, and licence to host, use, copy, reproduce, disclose, sell, resell, publish, broadcast, retitle, archive, store, cache, publicly perform, publicly display, reformat, translate, transmit, excerpt (in whole or in part), and distribute such Contributions (including, without limitation, your image and voice) for any purpose, commercial, advertising, or otherwise, and to prepare derivative works of, or incorporate into other works, such Contributions, and grant and authorise sublicences of the foregoing. The use and distribution may occur in any media formats and through any media channels.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              This licence will apply to any form, media, or technology now known or hereafter developed, and includes our use of your name, company name, and franchise name, as applicable, and any of the trademarks, service marks, trade names, logos, and personal and commercial images you provide. You waive all moral rights in your Contributions, and you warrant that moral rights have not otherwise been asserted in your Contributions.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              We do not assert any ownership over your Contributions. You retain full ownership of all of your Contributions and any intellectual property rights or other proprietary rights associated with your Contributions. We are not liable for any statements or representations in your Contributions provided by you in any area on the Services. You are solely responsible for your Contributions to the Services and you expressly agree to exonerate us from any and all responsibility and to refrain from any legal action against us regarding your Contributions.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              We have the right, in our sole and absolute discretion, (1) to edit, redact, or otherwise change any Contributions; (2) to re-categorise any Contributions to place them in more appropriate locations on the Services; and (3) to pre-screen or delete any Contributions at any time and for any reason, without notice. We have no obligation to monitor your Contributions.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              13. MOBILE APPLICATION LICENCE
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              Use Licence
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              If you access the Services via the App, then we grant you a revocable, non-exclusive, non-transferable, limited right to install and use the App on wireless electronic devices owned or controlled by you, and to access and use the App on such devices strictly in accordance with the terms and conditions of this mobile application licence contained in these Legal Terms. You shall not:
            </Text>

            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (1) except as permitted by applicable law, decompile, reverse engineer, disassemble, attempt to derive the source code of, or decrypt the App;
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (2) make any modification, adaptation, improvement, enhancement, translation, or derivative work from the App;
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (3) violate any applicable laws, rules, or regulations in connection with your access or use of the App;
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (4) remove, alter, or obscure any proprietary notice (including any notice of copyright or trademark) posted by us or the licensors of the App;
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (5) use the App for any revenue-generating endeavour, commercial enterprise, or other purpose for which it is not designed or intended;
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (6) make the App available over a network or other environment permitting access or use by multiple devices or users at the same time;
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (7) use the App for creating a product, service, or software that is, directly or indirectly, competitive with or in any way a substitute for the App;
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (8) use the App to send automated queries to any website or to send any unsolicited commercial email; or
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (9) use any proprietary information or any of our interfaces or our other intellectual property in the design, development, manufacture, licensing, or distribution of any applications, accessories, or devices for use with the App.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              Apple and Android Devices
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              The following terms apply when you use the App obtained from either the Apple Store or Google Play (each an 'App Distributor') to access the Services:
            </Text>

            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (1) the licence granted to you for our App is limited to a non-transferable licence to use the application on a device that utilises the Apple iOS or Android operating systems, as applicable, and in accordance with the usage rules set forth in the applicable App Distributor's terms of service;
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (2) we are responsible for providing any maintenance and support services with respect to the App as specified in the terms and conditions of this mobile application licence contained in these Legal Terms or as otherwise required under applicable law, and you acknowledge that each App Distributor has no obligation whatsoever to furnish any maintenance and support services with respect to the App;
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (3) in the event of any failure of the App to conform to any applicable warranty, you may notify the applicable App Distributor, and the App Distributor, in accordance with its terms and policies, may refund the purchase price, if any, paid for the App, and to the maximum extent permitted by applicable law, the App Distributor will have no other warranty obligation whatsoever with respect to the App;
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (4) you represent and warrant that (i) you are not located in a country that is subject to a US government embargo, or that has been designated by the US government as a 'terrorist supporting' country and (ii) you are not listed on any US government list of prohibited or restricted parties;
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (5) you must comply with applicable third-party terms of agreement when using the App, e.g., if you have a VoIP application, then you must not be in violation of their wireless data service agreement when using the App; and
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              (6) you acknowledge and agree that the App Distributors are third-party beneficiaries of the terms and conditions in this mobile application licence contained in these Legal Terms, and that each App Distributor will have the right (and will be deemed to have accepted the right) to enforce the terms and conditions in this mobile application licence contained in these Legal Terms against you as a third-party beneficiary thereof.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              14. SOCIAL MEDIA
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              As part of the functionality of the Services, you may link your account with online accounts you have with third-party service providers (each such account, a 'Third-Party Account') by either: (1) providing your Third-Party Account login information through the Services; or (2) allowing us to access your Third-Party Account, as is permitted under the applicable terms and conditions that govern your use of each Third-Party Account.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              You represent and warrant that you are entitled to disclose your Third-Party Account login information to us and/or grant us access to your Third-Party Account, without breach by you of any of the terms and conditions that govern your use of the applicable Third-Party Account, and without obligating us to pay any fees or making us subject to any usage limitations imposed by the third-party service provider of the Third-Party Account.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              15. THIRD-PARTY WEBSITES AND CONTENT
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              The Services may contain (or you may be sent via the Site or App) links to other websites ('Third-Party Websites') as well as articles, photographs, text, graphics, pictures, designs, music, sound, video, information, applications, software, and other content or items belonging to or originating from third parties ('Third-Party Content'). Such Third-Party Websites and Third-Party Content are not investigated, monitored, or checked for accuracy, appropriateness, or completeness by us, and we are not responsible for any Third-Party Websites accessed through the Services or any Third-Party Content posted on, available through, or installed from the Services, including the content, accuracy, offensiveness, opinions, reliability, privacy practices, or other policies of or contained in the Third-Party Websites or the Third-Party Content.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Inclusion of, linking to, or permitting the use or installation of any Third-Party Websites or any Third-Party Content does not imply approval or endorsement thereof by us. If you decide to leave the Services and access the Third-Party Websites or to use or install any Third-Party Content, you do so at your own risk, and you should be aware these Legal Terms no longer govern. You should review the applicable terms and policies, including privacy and data gathering practices, of any website to which you navigate from the Services or relating to any applications you use or install from the Services.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              16. SERVICES MANAGEMENT
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              We reserve the right, but not the obligation, to: (1) monitor the Services for violations of these Legal Terms; (2) take appropriate legal action against anyone who, in our sole discretion, violates the law or these Legal Terms, including without limitation, reporting such user to law enforcement authorities; (3) in our sole discretion and without limitation, refuse, restrict access to, limit the availability of, or disable (to the extent technologically feasible) any of your Contributions or any portion thereof; (4) in our sole discretion and without limitation, notice, or liability, to remove from the Services or otherwise disable all files and content that are excessive in size or are in any way burdensome to our systems; and (5) otherwise manage the Services in a manner designed to protect our rights and property and to facilitate the proper functioning of the Services.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              17. DIGITAL MILLENNIUM COPYRIGHT ACT (DMCA) NOTICE AND POLICY
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              Notifications
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              We respect the intellectual property rights of others. If you believe that any material available on or through the Services infringes upon any copyright you own or control, please immediately notify our Designated Copyright Agent using the contact information provided below (a 'Notification'). A copy of your Notification will be sent to the person who posted or stored the material addressed in the Notification. Please be advised that pursuant to federal law you may be held liable for damages if you make material misrepresentations in a Notification. Thus, if you are not sure that material located on or linked to by the Services infringes your copyright, you should consider first contacting an attorney.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              All Notifications should meet the requirements of DMCA 17 U.S.C. § 512(c)(3) and include the following information: (1) A physical or electronic signature of a person authorised to act on behalf of the owner of an exclusive right that is allegedly infringed; (2) identification of the copyrighted work claimed to have been infringed, or, if multiple copyrighted works on the Services are covered by the Notification, a representative list of such works on the Services; (3) identification of the material that is claimed to be infringing or to be the subject of infringing activity and that is to be removed or access to which is to be disabled, and information reasonably sufficient to permit us to locate the material; (4) information reasonably sufficient to permit us to contact the complaining party, such as an address, telephone number, and, if available, an email address at which the complaining party may be contacted; (5) a statement that the complaining party has a good faith belief that use of the material in the manner complained of is not authorised by the copyright owner, its agent, or the law; and (6) a statement that the information in the notification is accurate, and under penalty of perjury, that the complaining party is authorised to act on behalf of the owner of an exclusive right that is allegedly infringed upon.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              Designated Copyright Agent
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Abhik Sinha{"\n"}Attn: Copyright Agent{"\n"}Village Bhatirgram, PO Bekirpar, 788123{"\n"}Silchar, Assam 788123{"\n"}India
            </Text>

            <View style={styles.contentContainer}>
              <Text style={[styles.content, { color: colors.textSecondary }]}>
                Email:{" "}
                <Text
                  style={[styles.link, { color: colors.primary }]}
                  onPress={() => openEmail('director@klicktape.com')}
                >
                  director@klicktape.com
                </Text>
              </Text>
            </View>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              18. TERM AND TERMINATION
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              These Legal Terms shall remain in full force and effect while you use the Services. WITHOUT LIMITING ANY OTHER PROVISION OF THESE LEGAL TERMS, WE RESERVE THE RIGHT TO, IN OUR SOLE DISCRETION AND WITHOUT NOTICE OR LIABILITY, DENY ACCESS TO AND USE OF THE SERVICES (INCLUDING BLOCKING CERTAIN IP ADDRESSES), TO ANY PERSON FOR ANY REASON OR FOR NO REASON, INCLUDING WITHOUT LIMITATION FOR BREACH OF ANY REPRESENTATION, WARRANTY, OR COVENANT CONTAINED IN THESE LEGAL TERMS OR OF ANY APPLICABLE LAW OR REGULATION. WE MAY TERMINATE YOUR USE OR PARTICIPATION IN THE SERVICES OR DELETE YOUR ACCOUNT AND ANY CONTENT OR INFORMATION THAT YOU POSTED AT ANY TIME, WITHOUT WARNING, IN OUR SOLE DISCRETION.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              If we terminate or suspend your account for any reason, you are prohibited from registering and creating a new account under your name, a fake or borrowed name, or the name of any third party, even if you may be acting on behalf of the third party. In addition to terminating or suspending your account, we reserve the right to take appropriate legal action, including without limitation pursuing civil, criminal, and injunctive redress.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              19. MODIFICATIONS AND INTERRUPTIONS
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              We reserve the right to change, modify, or remove the contents of the Services at any time or for any reason at our sole discretion without notice. However, we have no obligation to update any information on our Services. We will not be liable to you or any third party for any modification, price change, suspension, or discontinuance of the Services.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              We cannot guarantee the Services will be available at all times. We may experience hardware, software, or other problems or need to perform maintenance related to the Services, resulting in interruptions, delays, or errors. We reserve the right to change, revise, update, suspend, discontinue, or otherwise modify the Services at any time or for any reason without notice to you. You agree that we have no liability whatsoever for any loss, damage, or inconvenience caused by your inability to access or use the Services during any downtime or discontinuance of the Services. Nothing in these Legal Terms will be construed to obligate us to maintain and support the Services or to supply any corrections, updates, or releases in connection therewith.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              20. GOVERNING LAW
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              These Legal Terms shall be governed by and defined following the laws of India. Klicktape and yourself irrevocably consent that the courts of India shall have exclusive jurisdiction to resolve any dispute which may arise in connection with these Legal Terms.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              21. DISPUTE RESOLUTION
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              Informal Negotiations
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              To expedite resolution and control the cost of any dispute, controversy, or claim related to these Legal Terms (each a 'Dispute' and collectively, the 'Disputes') brought by either you or us (individually, a 'Party' and collectively, the 'Parties'), the Parties agree to first attempt to negotiate any Dispute (except those Disputes expressly provided below) informally for at least thirty (30) days before initiating arbitration. Such informal negotiations commence upon written notice from one Party to the other Party.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              Binding Arbitration
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Any dispute arising out of or in connection with these Legal Terms, including any question regarding its existence, validity, or termination, shall be referred to and finally resolved by the International Commercial Arbitration Court under the European Arbitration Chamber (Belgium, Brussels, Avenue Louise, 146) according to the Rules of this ICAC, which, as a result of referring to it, is considered as the part of this clause. The number of arbitrators shall be three (3). The seat, or legal place, of arbitration shall be Silchar, India. The language of the proceedings shall be English. The governing law of these Legal Terms shall be the substantive law of India.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              Restrictions
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              The Parties agree that any arbitration shall be limited to the Dispute between the Parties individually. To the full extent permitted by law, (a) no arbitration shall be joined with any other proceeding; (b) there is no right or authority for any Dispute to be arbitrated on a class-action basis or to utilise class action procedures; and (c) there is no right or authority for any Dispute to be brought in a purported representative capacity on behalf of the general public or any other persons.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              Exceptions to Informal Negotiations and Arbitration
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              The Parties agree that the following Disputes are not subject to the above provisions concerning informal negotiations and binding arbitration: (a) any Disputes seeking to enforce or protect, or concerning the validity of, any of the intellectual property rights of a Party; (b) any Dispute related to, or arising from, allegations of theft, piracy, invasion of privacy, or unauthorised use; and (c) any claim for injunctive relief.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              If this provision is found to be illegal or unenforceable, then neither Party will elect to arbitrate any Dispute falling within that portion of this provision found to be illegal or unenforceable and such Dispute shall be decided by a court of competent jurisdiction within the courts listed for jurisdiction above, and the Parties agree to submit to the personal jurisdiction of that court.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              22. CORRECTIONS
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              There may be information on the Services that contains typographical errors, inaccuracies, or omissions, including descriptions, pricing, availability, and various other information. We reserve the right to correct any errors, inaccuracies, or omissions and to change or update the information on the Services at any time, without prior notice.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              23. DISCLAIMER
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              THE SERVICES ARE PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF THE SERVICES WILL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE SERVICES AND YOUR USE THEREOF, INCLUDING, WITHOUT LIMITATION, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE MAKE NO WARRANTIES OR REPRESENTATIONS ABOUT THE ACCURACY OR COMPLETENESS OF THE SERVICES' CONTENT OR THE CONTENT OF ANY WEBSITES OR MOBILE APPLICATIONS LINKED TO THE SERVICES AND WE WILL ASSUME NO LIABILITY OR RESPONSIBILITY FOR ANY (1) ERRORS, MISTAKES, OR INACCURACIES OF CONTENT AND MATERIALS, (2) PERSONAL INJURY OR PROPERTY DAMAGE, OF ANY NATURE WHATSOEVER, RESULTING FROM YOUR ACCESS TO AND USE OF THE SERVICES, (3) ANY UNAUTHORISED ACCESS TO OR USE OF OUR SECURE SERVERS AND/OR ANY AND ALL PERSONAL INFORMATION AND/OR FINANCIAL INFORMATION STORED THEREIN, (4) ANY INTERRUPTION OR CESSATION OF TRANSMISSION TO OR FROM THE SERVICES, (5) ANY BUGS, VIRUSES, TROJAN HORSES, OR THE LIKE WHICH MAY BE TRANSMITTED TO OR THROUGH THE SERVICES BY ANY THIRD PARTY, AND/OR (6) ANY ERRORS OR OMISSIONS IN ANY CONTENT AND MATERIALS OR FOR ANY LOSS OR DAMAGE OF ANY KIND INCURRED AS A RESULT OF THE USE OF ANY CONTENT POSTED, TRANSMITTED, OR OTHERWISE MADE AVAILABLE VIA THE SERVICES.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              24. LIMITATIONS OF LIABILITY
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM YOUR USE OF THE SERVICES, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. NOTWITHSTANDING ANYTHING TO THE CONTRARY CONTAINED HEREIN, OUR LIABILITY TO YOU FOR ANY CAUSE WHATSOEVER AND REGARDLESS OF THE FORM OF THE ACTION, WILL AT ALL TIMES BE LIMITED TO THE LESSER OF THE AMOUNT PAID, IF ANY, BY YOU TO US DURING THE ONE (1) MONTH PERIOD PRIOR TO ANY CAUSE OF ACTION ARISING OR INR 29. CERTAIN US STATE LAWS AND INTERNATIONAL LAWS DO NOT ALLOW LIMITATIONS ON IMPLIED WARRANTIES OR THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES. IF THESE LAWS APPLY TO YOU, SOME OR ALL OF THE ABOVE DISCLAIMERS OR LIMITATIONS MAY NOT APPLY TO YOU, AND YOU MAY HAVE ADDITIONAL RIGHTS.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              25. INDEMNIFICATION
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              You agree to defend, indemnify, and hold us harmless, including our subsidiaries, affiliates, and all of our respective officers, agents, partners, and employees, from and against any loss, damage, liability, claim, or demand, including reasonable attorneys' fees and expenses, made by any third party due to or arising out of: (1) your Contributions; (2) use of the Services; (3) breach of these Legal Terms; (4) any breach of your representations and warranties set forth in these Legal Terms; (5) your violation of the rights of a third party, including but not limited to intellectual property rights; or (6) any overt harmful act toward any other user of the Services with whom you connected via the Services.
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Notwithstanding the foregoing, we reserve the right, at your expense, to assume the exclusive defence and control of any matter for which you are required to indemnify us, and you agree to cooperate, at your expense, with our defence of such claims. We will use reasonable efforts to notify you of any such claim, action, or proceeding which is subject to this indemnification upon becoming aware of it.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              26. USER DATA
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              We will maintain certain data that you transmit to the Services for the purpose of managing the performance of the Services, as well as data relating to your use of the Services. Although we perform regular routine backups of data, you are solely responsible for all data that you transmit or that relates to any activity you have undertaken using the Services. You agree that we shall have no liability to you for any loss or corruption of any such data, and you hereby waive any right of action against us arising from any such loss or corruption of such data.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              27. ELECTRONIC COMMUNICATIONS, TRANSACTIONS, AND SIGNATURES
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Visiting the Services, sending us emails, and completing online forms constitute electronic communications. You consent to receive electronic communications, and you agree that all agreements, notices, disclosures, and other communications we provide to you electronically, via email and on the Services, satisfy any legal requirement that such communication be in writing. YOU HEREBY AGREE TO THE USE OF ELECTRONIC SIGNATURES, CONTRACTS, ORDERS, AND OTHER RECORDS, AND TO ELECTRONIC DELIVERY OF NOTICES, POLICIES, AND RECORDS OF TRANSACTIONS INITIATED OR COMPLETED BY US OR VIA THE SERVICES. You hereby waive any rights or requirements under any statutes, regulations, rules, ordinances, or other laws in any jurisdiction which require an original signature or delivery or retention of non-electronic records, or to payments or the granting of credits by any means other than electronic means.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              28. CALIFORNIA USERS AND RESIDENTS
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              If any complaint with us is not satisfactorily resolved, you can contact the Complaint Assistance Unit of the Division of Consumer Services of the California Department of Consumer Affairs in writing at 1625 North Market Blvd., Suite N 112, Sacramento, California 95834 or by telephone at (800) 952-5210 or (916) 445-1254.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              29. MISCELLANEOUS
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              These Legal Terms and any policies or operating rules posted by us on the Services or in respect to the Services constitute the entire agreement and understanding between you and us. Our failure to exercise or enforce any right or provision of these Legal Terms shall not operate as a waiver of such right or provision. These Legal Terms operate to the fullest extent permissible by law. We may assign any or all of our rights and obligations to others at any time. We shall not be responsible or liable for any loss, damage, delay, or failure to act caused by any cause beyond our reasonable control. If any provision or part of a provision of these Legal Terms is determined to be unlawful, void, or unenforceable, that provision or part of the provision is deemed severable from these Legal Terms and does not affect the validity and enforceability of any remaining provisions. There is no joint venture, partnership, employment or agency relationship created between you and us as a result of these Legal Terms or use of the Services. You agree that these Legal Terms will not be construed against us by virtue of having drafted them. You hereby waive any and all defences you may have based on the electronic form of these Legal Terms and the lack of signing by the parties hereto to execute these Legal Terms.
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              30. CONTACT US
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              In order to resolve a complaint regarding the Services or to receive further information regarding use of the Services, please contact us at:
            </Text>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              Klicktape{"\n"}Tarunodoy Road{"\n"}Silchar, Assam 788123{"\n"}India{"\n"}Phone: 9678011096
            </Text>

            <View style={styles.contentContainer}>
              <Text style={[styles.content, { color: colors.textSecondary }]}>
                Email:{" "}
                <Text
                  style={[styles.link, { color: colors.primary }]}
                  onPress={() => openEmail('director@klicktape.com')}
                >
                  director@klicktape.com
                </Text>
              </Text>
            </View>

            <Text style={[styles.content, { color: colors.textSecondary }]}>
              If you have any questions about these Terms and Conditions, please contact us:
            </Text>

            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Phone: 9678011096
            </Text>
            <View style={styles.bulletContainer}>
              <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
                • Email:{" "}
                <Text
                  style={[styles.link, { color: colors.primary }]}
                  onPress={() => openEmail('director@klicktape.com')}
                >
                  director@klicktape.com
                </Text>
              </Text>
            </View>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Address: Tarunodoy Road, Silchar, Assam 788123, India
            </Text>
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
