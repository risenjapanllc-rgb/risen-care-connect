-- RISEN CARE Static Standard Meaning Authority Migration
--
-- Generated mechanically from RisenStandardMeaningCatalog.
-- No document-specific migration logic.
--
-- Existing canonical meaning IDs are preserved.
-- Existing identities are never silently overwritten.
-- Any metadata disagreement aborts the transaction.

begin;


create temporary table
_risen_static_standard_meanings (
    entity_name text
        not null,

    field_name text
        not null,

    display_name text
        not null,

    synonyms text[]
        not null,

    primary key (
        entity_name,
        field_name
    )
)
on commit drop;


insert into
_risen_static_standard_meanings (
    entity_name,
    field_name,
    display_name,
    synonyms
)
values
(
    'user',
    'name',
    '利用者名',
    ARRAY['利用者名', '利用者氏名', 'user_name', 'client_name']::text[]
),
(
    'user',
    'birth_date',
    '生年月日',
    ARRAY['生年月日', '誕生日', 'birth_date', 'birthday', 'dob']::text[]
),
(
    'user',
    'gender',
    '性別',
    ARRAY['性別', 'gender', 'sex']::text[]
),
(
    'user',
    'user_code',
    '利用者番号',
    ARRAY['利用者番号', '利用者コード', 'user_code']::text[]
),
(
    'user',
    'blood_type',
    '血液型',
    ARRAY['血液型', 'blood_type']::text[]
),
(
    'user',
    'postal_code',
    '郵便番号',
    ARRAY['郵便番号', '郵便番号(住所)', '郵便番号（住所）', 'postal_code']::text[]
),
(
    'user',
    'address',
    '住所',
    ARRAY['住所', '現住所', 'address']::text[]
),
(
    'user',
    'phone',
    '電話番号',
    ARRAY['電話番号', 'TEL', '電話', 'phone']::text[]
),
(
    'user',
    'mobile',
    '携帯番号',
    ARRAY['携帯番号', '携帯電話番号', '携帯電話', 'mobile']::text[]
),
(
    'user',
    'email',
    'E-mail',
    ARRAY['E-mail', 'Email', 'メール', 'メールアドレス', 'email']::text[]
),
(
    'user',
    'name_kana',
    'フリガナ',
    ARRAY['フリガナ', 'ふりがな', '氏名カナ']::text[]
),
(
    'user',
    'blood_rh',
    'RH',
    ARRAY['RH', 'Rh', 'RH型']::text[]
),
(
    'user',
    'fax',
    'FAX番号',
    ARRAY['FAX番号', 'FAX', 'fax']::text[]
),
(
    'user',
    'registered_domicile_postal_code',
    '郵便番号(本籍地)',
    ARRAY['郵便番号(本籍地)', '郵便番号（本籍地）']::text[]
),
(
    'user',
    'registered_domicile',
    '本籍地',
    ARRAY['本籍地']::text[]
),
(
    'user',
    'memo',
    'メモ',
    ARRAY['メモ']::text[]
),
(
    'recipient_certificate',
    'certificate_type',
    '受給者証種別',
    ARRAY['受給者証種別']::text[]
),
(
    'recipient_certificate',
    'facility_type',
    '施設種別',
    ARRAY['施設種別']::text[]
),
(
    'recipient_certificate',
    'issued_date',
    '交付年月日',
    ARRAY['交付年月日', '交付日']::text[]
),
(
    'recipient_certificate',
    'issuing_authority_name',
    '支給市町村(都道府県)名',
    ARRAY['支給市町村(都道府県)名', '支給市町村（都道府県）名']::text[]
),
(
    'recipient_certificate',
    'valid_from',
    '開始日',
    ARRAY['開始日']::text[]
),
(
    'recipient_certificate',
    'disability_support_level',
    '障害程度区分・区分',
    ARRAY['障害程度区分・区分', '障害支援区分']::text[]
),
(
    'recipient_certificate',
    'physical_care_quantity',
    '身体介護支給量',
    ARRAY['身体介護支給量']::text[]
),
(
    'recipient_certificate',
    'housework_assistance_quantity',
    '家事援助支給量',
    ARRAY['家事援助支給量']::text[]
),
(
    'recipient_certificate',
    'outpatient_mobility_assistance_quantity',
    '通院介助(移動介護)支給量',
    ARRAY['通院介助(移動介護)支給量', '通院介助（移動介護）支給量']::text[]
),
(
    'recipient_certificate',
    'outpatient_physical_assistance_quantity',
    '通院介助(移動)・身体支給量',
    ARRAY['通院介助(移動)・身体支給量', '通院介助（移動）・身体支給量']::text[]
),
(
    'recipient_certificate',
    'daily_living_quantity',
    '日常生活支給量',
    ARRAY['日常生活支給量']::text[]
),
(
    'recipient_certificate',
    'day_service_quantity',
    '支給日数(デイⅠ・デイ支給量)',
    ARRAY['支給日数(デイⅠ・デイ支給量)', '支給日数（デイⅠ・デイ支給量）']::text[]
),
(
    'recipient_certificate',
    'day_service_ii_quantity',
    'デイⅡ支給量',
    ARRAY['デイⅡ支給量']::text[]
),
(
    'recipient_certificate',
    'meal_quantity',
    '給食支給量',
    ARRAY['給食支給量']::text[]
),
(
    'recipient_certificate',
    'bathing_quantity',
    '入浴支給量',
    ARRAY['入浴支給量']::text[]
),
(
    'recipient_certificate',
    'self_household_tier',
    '本人分階層区分',
    ARRAY['本人分階層区分']::text[]
),
(
    'recipient_certificate',
    'self_copayment_amount',
    '本人分利用者負担額',
    ARRAY['本人分利用者負担額']::text[]
),
(
    'recipient_certificate',
    'self_monthly_cap',
    '本人分上限月額',
    ARRAY['本人分上限月額']::text[]
),
(
    'recipient_certificate',
    'supporter_household_tier',
    '扶養義務者分階層区分',
    ARRAY['扶養義務者分階層区分']::text[]
),
(
    'recipient_certificate',
    'supporter_copayment_amount',
    '扶養義務者分利用者負担額',
    ARRAY['扶養義務者分利用者負担額']::text[]
),
(
    'recipient_certificate',
    'supporter_monthly_cap',
    '扶養義務者分上限月額',
    ARRAY['扶養義務者分上限月額']::text[]
),
(
    'recipient_certificate',
    'memo',
    'メモ(受給者証)',
    ARRAY['メモ(受給者証)', 'メモ（受給者証）']::text[]
),
(
    'recipient_certificate',
    'same_household_multi_user_cap_management',
    '同一世帯の複数利用者で上限管理',
    ARRAY['同一世帯の複数利用者で上限管理']::text[]
),
(
    'service_contract',
    'provider_name',
    '事業者名',
    ARRAY['事業者名']::text[]
),
(
    'service_contract',
    'provider_entry_number',
    '事業者記入欄番号',
    ARRAY['事業者記入欄番号']::text[]
),
(
    'service_contract',
    'contract_date',
    '契約日',
    ARRAY['契約日']::text[]
),
(
    'service_contract',
    'contract_type',
    '契約区分',
    ARRAY['契約区分']::text[]
),
(
    'service_contract',
    'service_content',
    'サービス内容',
    ARRAY['サービス内容']::text[]
),
(
    'service_contract',
    'contracted_quantity_hours',
    '契約支給量(時間)',
    ARRAY['契約支給量(時間)', '契約支給量（時間）']::text[]
),
(
    'service_contract',
    'contracted_quantity_days_or_times',
    '契約支給量(日)又は(回)',
    ARRAY['契約支給量(日)又は(回)', '契約支給量（日）又は（回）']::text[]
),
(
    'service_contract',
    'contracted_meal_quantity',
    '契約支給量(給食)',
    ARRAY['契約支給量(給食)', '契約支給量（給食）']::text[]
),
(
    'service_contract',
    'contracted_bathing_quantity',
    '契約支給量(入浴)',
    ARRAY['契約支給量(入浴)', '契約支給量（入浴）']::text[]
),
(
    'service_contract',
    'service_end_date',
    '提供終了日',
    ARRAY['提供終了日']::text[]
),
(
    'service_contract',
    'end_classification',
    '終了区分',
    ARRAY['終了区分']::text[]
),
(
    'service_delivery',
    'provided_quantity_hours',
    '既提供量(時間)',
    ARRAY['既提供量(時間)', '既提供量（時間）']::text[]
),
(
    'service_delivery',
    'provided_quantity_days_or_times',
    '既提供量(日)又は(回)',
    ARRAY['既提供量(日)又は(回)', '既提供量（日）又は（回）']::text[]
),
(
    'service_delivery',
    'provided_meal_quantity',
    '既提供量(給食)',
    ARRAY['既提供量(給食)', '既提供量（給食）']::text[]
),
(
    'service_delivery',
    'provided_bathing_quantity',
    '既提供量(入浴)',
    ARRAY['既提供量(入浴)', '既提供量（入浴）']::text[]
),
(
    'service_entitlement',
    'boarding_assistance_quantity',
    '乗降介助支給量',
    ARRAY['乗降介助支給量']::text[]
),
(
    'service_entitlement',
    'behavior_support_quantity',
    '行動援護支給量',
    ARRAY['行動援護支給量']::text[]
),
(
    'service_entitlement',
    'outing_assistance_quantity',
    '外出介護支給量',
    ARRAY['外出介護支給量']::text[]
),
(
    'service_entitlement',
    'outing_with_physical_care_quantity',
    '外出・身体支給量',
    ARRAY['外出・身体支給量']::text[]
),
(
    'service_addition',
    'meal_addition_i',
    '食事加算(食事加算Ⅰ)',
    ARRAY['食事加算(食事加算Ⅰ)', '食事加算（食事加算Ⅰ）']::text[]
),
(
    'cost_sharing',
    'copayment_rate_percent',
    '負担率(%)',
    ARRAY['負担率(%)', '負担率（%）']::text[]
),
(
    'cost_sharing',
    'income_classification',
    '所得区分',
    ARRAY['所得区分']::text[]
),
(
    'cost_sharing',
    'monthly_cap',
    '利用者負担上限月額',
    ARRAY['利用者負担上限月額']::text[]
),
(
    'cost_sharing',
    'reduced_monthly_cap',
    '利用者負担軽減後上限月額',
    ARRAY['利用者負担軽減後上限月額']::text[]
),
(
    'cost_sharing',
    'social_welfare_corporation_reduction',
    '社会福祉法人減免',
    ARRAY['社会福祉法人減免']::text[]
),
(
    'upper_limit_management',
    'expected_cap_reached_classification',
    '上限額到達見込区分',
    ARRAY['上限額到達見込区分']::text[]
),
(
    'cost_sharing',
    'relief_program_classification',
    '利用者負担緩和事業区分',
    ARRAY['利用者負担緩和事業区分']::text[]
),
(
    'cost_sharing',
    'relief_program_cap',
    '利用者負担緩和事業上限額',
    ARRAY['利用者負担緩和事業上限額']::text[]
),
(
    'upper_limit_management',
    'managing_provider',
    '上限管理事業者',
    ARRAY['上限管理事業者']::text[]
),
(
    'service_entitlement',
    'mutual_use',
    '相互利用',
    ARRAY['相互利用']::text[]
),
(
    'service_entitlement',
    'severe_home_visit_comprehensive',
    '重度訪問介護重度包括',
    ARRAY['重度訪問介護重度包括']::text[]
),
(
    'service_entitlement',
    'severe_home_visit_class_6',
    '重度訪問介護区分６',
    ARRAY['重度訪問介護区分６', '重度訪問介護区分6']::text[]
),
(
    'service_entitlement',
    'severe_home_visit_other',
    '重度訪問介護その他',
    ARRAY['重度訪問介護その他']::text[]
),
(
    'service_entitlement',
    'extremely_severe_classification',
    '著しく重度の者区分',
    ARRAY['著しく重度の者区分']::text[]
),
(
    'service_addition',
    'meal_addition_ii',
    '食事加算Ⅱ',
    ARRAY['食事加算Ⅱ']::text[]
),
(
    'recipient_certificate',
    'legacy_law_recipient',
    '特定旧法受給者',
    ARRAY['特定旧法受給者']::text[]
),
(
    'service_addition',
    'nutrition_management_on_service_day',
    '利用実績のある日に栄養管理体制加算を算定',
    ARRAY['利用実績のある日に栄養管理体制加算を算定']::text[]
),
(
    'service_entitlement',
    'accompanying_support_primary',
    '同行援護中心',
    ARRAY['同行援護中心']::text[]
),
(
    'service_entitlement',
    'accompanying_support_with_physical_care',
    '同行援護（身体あり）',
    ARRAY['同行援護（身体あり）', '同行援護(身体あり)']::text[]
),
(
    'source_specific',
    'handwritten_contract_quantity',
    '手書・契約量',
    ARRAY['手書・契約量']::text[]
),
(
    'source_specific',
    'handwritten_contract_quantity_end',
    '手書・契約量(終了)',
    ARRAY['手書・契約量(終了)', '手書・契約量（終了）']::text[]
),
(
    'support_record',
    'record_date',
    '記録日時',
    ARRAY['記録日時', '日時', 'record_date', 'record_datetime']::text[]
),
(
    'support_record',
    'staff_name',
    '記録者名',
    ARRAY['記録者', '記録者名', '記入者', '担当職員', '職員名', 'staff_name']::text[]
),
(
    'support_record',
    'record_content',
    '支援記録本文',
    ARRAY['支援記録本文', '記録内容', '処遇内容', '本文', 'record_content']::text[]
),
(
    'support_record',
    'record_category',
    '記録区分',
    ARRAY['記録区分', '種類', 'record_category']::text[]
),
(
    'support_record',
    'created_at',
    '登録日時',
    ARRAY['登録日時', '作成日時', 'created_at']::text[]
),
(
    'support_record',
    'temperature',
    '記録時気温',
    ARRAY['記録時気温', 'temperature']::text[]
),
(
    'support_record',
    'weather',
    '記録時天候',
    ARRAY['記録時天候', 'weather']::text[]
),
(
    'support_record',
    'presence_status',
    '在園状態',
    ARRAY['presence_status']::text[]
),
(
    'support_record',
    'activity',
    '行動内容',
    ARRAY['行動内容', 'activity']::text[]
),
(
    'support_record',
    'body_temperature',
    '体温',
    ARRAY['体温', 'body_temperature']::text[]
),
(
    'support_record',
    'systolic_blood_pressure',
    '収縮期血圧',
    ARRAY['収縮期血圧', '最高血圧', 'systolic_blood_pressure']::text[]
),
(
    'support_record',
    'diastolic_blood_pressure',
    '拡張期血圧',
    ARRAY['拡張期血圧', '最低血圧', 'diastolic_blood_pressure']::text[]
),
(
    'support_record',
    'pulse_rate',
    '脈拍',
    ARRAY['脈拍', 'pulse_rate']::text[]
),
(
    'support_record',
    'meal_intake_ratio',
    '食事摂取割合',
    ARRAY['食事摂取割合', '食事摂取率', 'meal_intake_ratio']::text[]
),
(
    'support_record',
    'record_location',
    '記録場所',
    ARRAY['記録場所', 'record_location']::text[]
),
(
    'support_record',
    'urine_amount_category',
    '尿量区分',
    ARRAY['尿量区分', 'urine_amount_category']::text[]
),
(
    'support_record',
    'stool_amount_category',
    '便量区分',
    ARRAY['便量区分', 'stool_amount_category']::text[]
),
(
    'support_record',
    'sleep_state',
    '睡眠状態',
    ARRAY['睡眠状態', 'sleep_state']::text[]
),
(
    'support_record',
    'event_state',
    '行動イベント状態',
    ARRAY['event_state']::text[]
),
(
    'support_record',
    'extension_value',
    'その他・拡張情報',
    ARRAY['その他1', 'その他2', 'その他3', 'extension_value']::text[]
),
(
    'source_record',
    'protection_flag',
    '原本保護フラグ',
    ARRAY['source_protection_flag']::text[]
),
(
    'source_record',
    'group_state_code',
    '原本記録グループ状態コード',
    ARRAY['source_group_state_code']::text[]
),
(
    'source_record',
    'record_id',
    '原本レコードID',
    ARRAY['source_record_id']::text[]
),
(
    'source_record',
    'revision_flag',
    '原本修正フラグ',
    ARRAY['source_revision_flag']::text[]
),
(
    'source_record',
    'detail_key',
    '原本詳細キー',
    ARRAY['詳細KEY', 'source_detail_key']::text[]
),
(
    'recipient_certificate',
    'certificate_number',
    '受給者証番号',
    ARRAY['受給者証NO', '受給者証No', '受給者証番号']::text[]
),
(
    'recipient_certificate',
    'valid_until',
    '受給者証有効期限',
    ARRAY['有効期限', '受給者証有効期限', '終了日']::text[]
);


do $$
declare
    v_catalog_count integer;
begin
    select count(*)
    into v_catalog_count
    from _risen_static_standard_meanings;

    if v_catalog_count <> 107 then
        raise exception
            'Static Standard Meaning catalog count mismatch: %',
            v_catalog_count;
    end if;
end;
$$;


-- Existing canonical identities must agree with the static catalog.
-- Synonym order is ignored, but synonym membership must agree.

do $$
begin
    if exists (
        select 1
        from _risen_static_standard_meanings as s
        join public.standard_meanings as m
          on m.entity_name = s.entity_name
         and m.field_name = s.field_name
        where
            m.display_name <> s.display_name
            or
            (
                select array_agg(value order by value)
                from (
                    select distinct
                        unnest(m.synonyms) as value
                ) as existing_values
            )
            is distinct from
            (
                select array_agg(value order by value)
                from (
                    select distinct
                        unnest(s.synonyms) as value
                ) as static_values
            )
    ) then
        raise exception
            'Existing Standard Meaning metadata conflicts with static catalog';
    end if;
end;
$$;


insert into public.standard_meanings (
    entity_name,
    field_name,
    display_name,
    synonyms,
    status
)
select
    s.entity_name,
    s.field_name,
    s.display_name,
    s.synonyms,
    'active'
from _risen_static_standard_meanings as s
on conflict (
    entity_name,
    field_name
)
do nothing;


-- Every static identity must now resolve to exactly one canonical row.

do $$
begin
    if exists (
        select 1
        from _risen_static_standard_meanings as s
        left join public.standard_meanings as m
          on m.entity_name = s.entity_name
         and m.field_name = s.field_name
        where m.meaning_id is null
    ) then
        raise exception
            'Static Standard Meaning migration incomplete';
    end if;
end;
$$;


commit;
