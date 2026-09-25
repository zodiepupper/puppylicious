import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DefaultText } from './default-text';
import { CheckChip, CheckChips } from './check-chip';
import { RangeSlider } from './range-slider';
import { LabelledSlider } from './labelled-slider';
import { Toggle } from './toggle';
import { LogoActivityIndicator } from './logo/logo-activity-indicator';
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
import { optionGroupToDataKey, withCurrentValue } from './search-filter-screen';
import { showSearchFilters } from './modal/search-filters-modal';

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
  const { title, Icon, input } = withCurrentValue(og, data, signedInUser);

  return (
    <View style={styles.filter}>
      <View style={styles.filterTitle}>
        {Icon && <Icon color={appTheme.secondaryColor} />}
        <DefaultText style={styles.filterTitleText}>{title}</DefaultText>
      </View>
      <PanelInput
        key={JSON.stringify(data[optionGroupToDataKey(og)])}
        input={input}
      />
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
      <Pressable
        onPress={() => showSearchFilters(true)}
        style={[
          styles.advanced,
          { borderTopColor: appTheme.interactiveBorderColor },
        ]}
      >
        <Ionicons
          style={{ fontSize: 16, color: appTheme.secondaryColor }}
          name="options-outline"
        />
        <DefaultText style={styles.advancedText}>
          Advanced filters
        </DefaultText>
        <Ionicons
          style={{ fontSize: 20, color: appTheme.secondaryColor }}
          name="chevron-forward"
        />
      </Pressable>
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
    padding: 16,
    paddingTop: 8,
    gap: 24,
  },
  filter: {
    gap: 8,
  },
  filterTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterTitleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginHorizontal: 10,
  },
  invalid: {
    textAlign: 'center',
    color: 'red',
  },
  advanced: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 16,
    borderTopWidth: 1,
  },
  advancedText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
});

export {
  SearchFilterPanel,
};
