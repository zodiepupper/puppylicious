import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  NavigationAction,
  NavigationContainer,
  NavigationIndependentTree,
} from '@react-navigation/native';
import { DefaultModal } from './default-modal';
import { backgroundColors } from './background-colors';
import { SearchFilterScreen } from '../search-filter-screen';
import { listen, notify, lastEvent } from '../../events/events';
import { useAppTheme } from '../../app-theme/app-theme';

const EVENT_KEY = 'show-search-filters';

const showSearchFilters = (isVisible: boolean) =>
  notify<boolean>(EVENT_KEY, isVisible);

const SearchFiltersModal = () => {
  const { appTheme } = useAppTheme();
  const [isVisible, setIsVisible] = useState(
    () => lastEvent<boolean>(EVENT_KEY) ?? false);

  useEffect(() => {
    return listen<boolean>(EVENT_KEY, (x) => setIsVisible(x ?? false), true);
  }, []);

  const close = useCallback(() => showSearchFilters(false), []);

  const onUnhandledAction = useCallback((action: NavigationAction) => {
    if (action.type === 'GO_BACK') {
      close();
    }
  }, [close]);

  return (
    <DefaultModal
      transparent={true}
      visible={isVisible}
      onRequestClose={close}
    >
      <View style={[styles.backdrop, backgroundColors.dark]}>
        <View
          style={[styles.card, { backgroundColor: appTheme.primaryColor }]}
        >
          <NavigationIndependentTree>
            <NavigationContainer
              documentTitle={{ enabled: false }}
              onUnhandledAction={onUnhandledAction}
            >
              <SearchFilterScreen />
            </NavigationContainer>
          </NavigationIndependentTree>
        </View>
      </View>
    </DefaultModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  card: {
    width: '100%',
    height: '100%',
    maxWidth: 600,
    maxHeight: 900,
    borderRadius: 10,
    overflow: 'hidden',
  },
});

export {
  SearchFiltersModal,
  showSearchFilters,
};
