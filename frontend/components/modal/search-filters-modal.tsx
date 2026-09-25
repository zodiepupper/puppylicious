import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  NavigationAction,
  NavigationContainer,
  NavigationIndependentTree,
} from '@react-navigation/native';
import { DefaultModal } from './default-modal';
import { backgroundColors } from './background-colors';
import { SearchFilterScreen } from '../search-filter-screen';
import { ButtonWithCenteredText } from '../button/centered-text';
import { requestSearch } from '../../events/search-requests';
import { listen, notify } from '../../events/events';
import { useAppTheme } from '../../app-theme/app-theme';

const EVENT_KEY = 'show-search-filters';

const showSearchFilters = (isVisible: boolean) =>
  notify<boolean>(EVENT_KEY, isVisible);

const close = () => showSearchFilters(false);

const search = () => {
  requestSearch();
  close();
};

const onUnhandledAction = (action: NavigationAction) => {
  if (action.type === 'GO_BACK') {
    close();
  }
};

const SearchFiltersCard = () => {
  const { appTheme } = useAppTheme();
  const [isAtFilterList, setIsAtFilterList] = useState(true);

  return (
    <View style={[styles.card, { backgroundColor: appTheme.primaryColor }]}>
      <View style={styles.navigator}>
        <NavigationIndependentTree>
          <NavigationContainer
            documentTitle={{ enabled: false }}
            onUnhandledAction={onUnhandledAction}
            onStateChange={(state) => setIsAtFilterList(state?.index === 0)}
          >
            <SearchFilterScreen />
          </NavigationContainer>
        </NavigationIndependentTree>
      </View>
      {isAtFilterList &&
        <View
          style={[
            styles.footer,
            { borderTopColor: appTheme.interactiveBorderColor },
          ]}
        >
          <ButtonWithCenteredText
            onPress={search}
            containerStyle={styles.searchButton}
          >
            Search
          </ButtonWithCenteredText>
        </View>
      }
    </View>
  );
};

const SearchFiltersModal = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    return listen<boolean>(EVENT_KEY, (x) => setIsVisible(x ?? false));
  }, []);

  return (
    <DefaultModal
      transparent={true}
      visible={isVisible}
      onRequestClose={close}
    >
      <View style={[styles.backdrop, backgroundColors.dark]}>
        <SearchFiltersCard />
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
  navigator: {
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  searchButton: {
    width: '100%',
    maxWidth: 400,
  },
});

export {
  SearchFiltersModal,
  showSearchFilters,
};
