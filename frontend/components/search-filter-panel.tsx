import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DefaultText } from './default-text';
import { CheckChip, CheckChips } from './check-chip';
import { RangeSlider } from './range-slider';
import { LabelledSlider } from './labelled-slider';
import { Toggle } from './toggle';
import { LogoActivityIndicator } from './logo/logo-activity-indicator';
import { ButtonWithCenteredText } from './button/centered-text';
import { SidePanelCard, SidePanelHeading } from './navigation/side-panel';
import { useAppTheme } from '../app-theme/app-theme';
import { api } from '../api/api';
import { useSignedInUser } from '../events/signed-in-user';
import {
  SearchFilters,
  getSearchFilters,
  setSearchFilters,
  useSearchFilters,
} from '../events/search-filters';
import {
  OptionGroup,
  OptionGroupCheckChips,
  OptionGroupInputs,
  OptionGroupRangeSlider,
  OptionGroupSlider,
  isOptionGroupCheckChips,
  isOptionGroupRangeSlider,
  isOptionGroupSlider,
  searchBasicsOptionGroups,
} from '../data/option-groups';
import {
  getCurrentValueAsLabel,
  optionGroupToDataKey,
  withCurrentValue,
} from './search-filter-screen';
import { showSearchFilters } from './modal/search-filters-modal';
import { requestSearch } from '../events/search-requests';

const collapsedTitles = new Set<string>();

const PanelCheckChips = ({ input }: { input: OptionGroupCheckChips }) => {
  const [isInvalid, setIsInvalid] = useState(false);
  const checked = useRef(new Set(
    input.checkChips.values.flatMap((v) => v.checked ? [v.label] : [])));

  const onChange = async (label: string, isChecked: boolean) => {
    if (isChecked) {
      checked.current.add(label);
    } else {
      checked.current.delete(label);
    }
    setIsInvalid(!(await input.checkChips.submit([...checked.current])));
  };

  return (
    <>
      <CheckChips>
        {input.checkChips.values.map((v) =>
          <CheckChip
            key={v.label}
            compact={true}
            label={v.label}
            initialCheckedState={v.checked}
            onChange={(isChecked) => onChange(v.label, isChecked)}
          />
        )}
      </CheckChips>
      {isInvalid &&
        <DefaultText style={styles.invalid}>
          You need to select at least one option
        </DefaultText>
      }
    </>
  );
};

const PanelRangeSlider = ({ input }: { input: OptionGroupRangeSlider }) => {
  const { sliderMin, sliderMax, currentMin, currentMax } = input.rangeSlider;
  const lower = useRef(currentMin ?? sliderMin);
  const upper = useRef(currentMax ?? sliderMax);

  const submit = useCallback(() => {
    input.rangeSlider.submit(
      lower.current === sliderMin ? null : lower.current,
      upper.current === sliderMax ? null : upper.current,
    );
  }, []);

  return (
    <RangeSlider
      initialLowerValue={lower.current}
      initialUpperValue={upper.current}
      unitsLabel={input.rangeSlider.unitsLabel}
      minimumValue={sliderMin}
      maximumValue={sliderMax}
      onLowerValueChange={(v) => { lower.current = v; }}
      onUpperValueChange={(v) => { upper.current = v; }}
      onSlidingComplete={submit}
      valueRewriter={input.rangeSlider.valueRewriter}
      scale={input.rangeSlider.scale}
      containerStyle={styles.rangeSlider}
    />
  );
};

const PanelSlider = ({ input }: { input: OptionGroupSlider }) => {
  const { slider } = input;
  const value = useRef(slider.currentValue ?? slider.defaultValue);

  const submit = useCallback(() => {
    slider.submit(
      slider.addPlusAtMax && value.current === slider.sliderMax ?
        null :
        value.current
    );
  }, []);

  return (
    <>
      <LabelledSlider
        label={`Max (${slider.unitsLabel})`}
        minimumValue={slider.sliderMin}
        maximumValue={slider.sliderMax}
        initialValue={value.current}
        onValueChange={(v) => { value.current = v; }}
        onSlidingComplete={submit}
        step={slider.step}
        addPlusAtMax={slider.addPlusAtMax}
        valueRewriter={slider.valueRewriter}
        scale={slider.scale}
      />
      {slider.toggle &&
        <View style={styles.toggleRow}>
          <DefaultText>{slider.toggle.label}</DefaultText>
          <Toggle
            value={slider.toggle.currentValue ?? false}
            onValueChange={slider.toggle.submit}
          />
        </View>
      }
    </>
  );
};

const PanelInput = ({ input }: { input: OptionGroupInputs }) => {
  if (isOptionGroupCheckChips(input)) {
    return <PanelCheckChips input={input} />;
  }
  if (isOptionGroupRangeSlider(input)) {
    return <PanelRangeSlider input={input} />;
  }
  if (isOptionGroupSlider(input)) {
    return <PanelSlider input={input} />;
  }
  return null;
};

const PanelFilter = ({ og, data }: {
  og: OptionGroup<OptionGroupInputs>
  data: SearchFilters
}) => {
  const { appTheme } = useAppTheme();
  const [signedInUser] = useSignedInUser();
  const [isOpen, setIsOpen] = useState(!collapsedTitles.has(og.title));
  const current = withCurrentValue(og, data, signedInUser);
  const { title, Icon, input } = current;

  const toggle = () => {
    if (isOpen) {
      collapsedTitles.add(title);
    } else {
      collapsedTitles.delete(title);
    }
    setIsOpen(!isOpen);
  };

  return (
    <View style={styles.filter}>
      <Pressable style={styles.filterTitle} onPress={toggle}>
        {Icon && <Icon color={appTheme.secondaryColor} />}
        <DefaultText style={styles.filterTitleText}>{title}</DefaultText>
        <DefaultText
          numberOfLines={1}
          style={[styles.summary, { color: appTheme.hintColor }]}
        >
          {!isOpen && (getCurrentValueAsLabel(current, signedInUser) ?? 'Any')}
        </DefaultText>
        <Ionicons
          style={{ fontSize: 18, color: appTheme.hintColor }}
          name={isOpen ? 'chevron-up' : 'chevron-down'}
        />
      </Pressable>
      {isOpen &&
        <PanelInput
          key={JSON.stringify(data[optionGroupToDataKey(og)])}
          input={input}
        />
      }
    </View>
  );
};

const SearchFilterPanel = () => {
  const { appTheme } = useAppTheme();
  const data = useSearchFilters();

  useEffect(() => {
    if (getSearchFilters()) return;
    let cancelled = false;
    (async () => {
      const response = await api<SearchFilters>('get', '/search-filters');
      if (!cancelled && response.json) {
        setSearchFilters(response.json);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <SidePanelCard style={styles.card}>
      <SidePanelHeading isFirst={true}>Search filters</SidePanelHeading>
      {!data &&
        <View style={styles.loading}>
          <LogoActivityIndicator size="large" color={appTheme.brandColor} />
        </View>
      }
      {data &&
        <ScrollView contentContainerStyle={styles.content}>
          {searchBasicsOptionGroups.map((og) =>
            <PanelFilter key={og.title} og={og} data={data} />
          )}
        </ScrollView>
      }
      <View
        style={[
          styles.footer,
          { borderTopColor: appTheme.interactiveBorderColor },
        ]}
      >
        <Pressable
          onPress={() => showSearchFilters(true)}
          style={styles.advanced}
        >
          <Ionicons
            style={{ fontSize: 16, color: appTheme.secondaryColor }}
            name="options-outline"
          />
          <DefaultText style={styles.advancedText}>
            Advanced filters
          </DefaultText>
        </Pressable>
        <ButtonWithCenteredText
          onPress={requestSearch}
          containerStyle={styles.searchButton}
        >
          Search
        </ButtonWithCenteredText>
      </View>
    </SidePanelCard>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 12,
  },
  filter: {
    gap: 4,
  },
  filterTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  filterTitleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  summary: {
    flex: 1,
    textAlign: 'right',
  },
  rangeSlider: {
    gap: 0,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 10,
  },
  invalid: {
    textAlign: 'center',
    color: 'red',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  advanced: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  advancedText: {
    fontWeight: '700',
  },
  searchButton: {
    flex: 1,
    maxWidth: 140,
    height: 44,
  },
});

export {
  SearchFilterPanel,
};
