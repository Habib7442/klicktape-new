# Theme Update Guide

This guide explains how to update all screens in the app to use the new theme system.

## Step 1: Import the necessary components

In each file that uses LinearGradient with hardcoded colors, add these imports:

```tsx
import ThemedGradient from "@/components/ThemedGradient";
import { useTheme } from "@/src/context/ThemeContext";
```

## Step 2: Replace LinearGradient with ThemedGradient

Replace:
```tsx
<LinearGradient
  colors={["#000000", "#1a1a1a", "#2a2a2a"]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.container}
>
  {/* content */}
</LinearGradient>
```

With:
```tsx
<ThemedGradient style={styles.container}>
  {/* content */}
</ThemedGradient>
```

## Step 3: Add useTheme hook

Add this near the top of your component:

```tsx
const { colors } = useTheme();
```

## Step 4: Update text colors

Replace hardcoded text colors with theme colors:

```tsx
<Text style={styles.title}>Title</Text>
```

With:
```tsx
<Text style={[styles.title, { color: colors.text }]}>Title</Text>
```

## Step 5: Update StyleSheet

Remove hardcoded colors from your StyleSheet:

```tsx
title: {
  fontSize: 24,
  fontFamily: "Rubik-Bold",
  color: "#FFFFFF", // Remove this line
},
```

## Step 6: Update icon colors

Replace hardcoded icon colors:

```tsx
<Feather name="menu" size={24} color="#FFFFFF" />
```

With:
```tsx
<Feather name="menu" size={24} color={colors.text} />
```

## Files to Update

The following files need to be updated:

1. app/(root)/(tabs)/home.tsx ✅
2. app/(root)/(tabs)/search.tsx
3. app/(root)/(tabs)/create.tsx
4. app/(root)/(tabs)/reels.tsx
5. app/(root)/(tabs)/profile.tsx
6. app/(root)/chat/index.tsx
7. app/(root)/chat/[id].tsx
8. app/(root)/notifications.tsx
9. app/(root)/settings.tsx ✅
10. app/(root)/appearance.tsx ✅
11. app/(root)/edit-profile.tsx
12. app/(root)/create-profile.tsx
13. app/(root)/welcome-main.tsx
14. app/(root)/reel/[id].tsx
15. app/(root)/post/[id].tsx
16. app/(root)/userProfile/[id].tsx
17. app/(auth)/sign-in.tsx
18. app/(auth)/sign-up.tsx
19. app/(auth)/welcome.tsx
20. app/reset-password.tsx
21. components/CreateReel.tsx
22. components/Sidebar.tsx

## Testing

After updating each file, test the app in both light and dark modes to ensure everything looks correct.
