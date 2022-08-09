// Styles
import './VTextField.sass'

// Components
import { filterFieldProps, makeVFieldProps, VField } from '@/components/VField/VField'
import { filterInputProps, makeVInputProps, VInput } from '@/components/VInput/VInput'
import { VCounter } from '@/components/VCounter'

// Directives
import Intersect from '@/directives/intersect'

// Composables
import { forwardRefs } from '@/composables/forwardRefs'
import { useProxiedModel } from '@/composables/proxiedModel'

// Utilities
import { computed, nextTick, ref } from 'vue'
import { filterInputAttrs, genericComponent, useRender } from '@/util'

// Types
import type { PropType } from 'vue'
import type { VFieldSlots } from '@/components/VField/VField'
import type { VInputSlots } from '@/components/VInput/VInput'

const activeTypes = ['color', 'file', 'time', 'date', 'datetime-local', 'week', 'month']

export const VTextField = genericComponent<new <T>() => {
  $slots: VInputSlots & VFieldSlots
}>()({
  name: 'VTextField',

  directives: { Intersect },

  inheritAttrs: false,

  props: {
    autofocus: Boolean,
    counter: [Boolean, Number, String] as PropType<true | number | string>,
    counterValue: Function as PropType<(value: any) => number>,
    hint: String,
    persistentHint: Boolean,
    prefix: String,
    placeholder: String,
    persistentPlaceholder: Boolean,
    persistentCounter: Boolean,
    suffix: String,
    type: {
      type: String,
      default: 'text',
    },

    ...makeVInputProps(),
    ...makeVFieldProps(),
  },

  emits: {
    'click:clear': (e: MouseEvent) => true,
    'click:control': (e: MouseEvent) => true,
    'click:input': (e: MouseEvent) => true,
    'update:modelValue': (val: string) => true,
  },

  setup (props, { attrs, emit, slots }) {
    const model = useProxiedModel(props, 'modelValue')
    const counterValue = computed(() => {
      return typeof props.counterValue === 'function'
        ? props.counterValue(model.value)
        : (model.value ?? '').toString().length
    })
    const max = computed(() => {
      if (attrs.maxlength) return attrs.maxlength as undefined

      if (
        !props.counter ||
        (typeof props.counter !== 'number' &&
        typeof props.counter !== 'string')
      ) return undefined

      return props.counter
    })

    function onIntersect (
      isIntersecting: boolean,
      entries: IntersectionObserverEntry[]
    ) {
      if (!props.autofocus || !isIntersecting) return

      (entries[0].target as HTMLInputElement)?.focus?.()
    }

    const vInputRef = ref<VInput>()
    const vFieldRef = ref<VField>()
    const isFocused = ref(false)
    const inputRef = ref<HTMLInputElement>()
    const isActive = computed(() => (
      activeTypes.includes(props.type) ||
      props.persistentPlaceholder ||
      isFocused.value
    ))
    const messages = computed(() => {
      return props.messages.length
        ? props.messages
        : (isFocused.value || props.persistentHint) ? props.hint : ''
    })
    function onFocus () {
      if (inputRef.value !== document.activeElement) {
        inputRef.value?.focus()
      }

      if (!isFocused.value) isFocused.value = true
    }
    function onControlClick (e: MouseEvent) {
      onFocus()

      emit('click:control', e)
    }
    function onClear (e: MouseEvent) {
      e.stopPropagation()

      onFocus()

      nextTick(() => {
        model.value = ''

        emit('click:clear', e)
      })
    }
    function onInput (e: Event) {
      model.value = (e.target as HTMLInputElement).value
    }

    useRender(() => {
      const hasCounter = !!(slots.counter || props.counter || props.counterValue)
      const hasDetails = !!(hasCounter || slots.details)
      const [rootAttrs, inputAttrs] = filterInputAttrs(attrs)
      const [{ modelValue: _, ...inputProps }] = filterInputProps(props)
      const [fieldProps] = filterFieldProps(props)

      return (
        <VInput
          ref={ vInputRef }
          v-model={ model.value }
          class={[
            'v-text-field',
            {
              'v-text-field--prefixed': props.prefix,
              'v-text-field--suffixed': props.suffix,
              'v-text-field--flush-details': ['plain', 'underlined'].includes(props.variant),
            },
          ]}
          onClick:prepend={ attrs['onClick:prepend'] }
          onClick:append={ attrs['onClick:append'] }
          { ...rootAttrs }
          { ...inputProps }
          messages={ messages.value }
        >
          {{
            ...slots,
            default: ({
              id,
              isDisabled,
              isDirty,
              isReadonly,
              isValid,
            }) => (
              <VField
                ref={ vFieldRef }
                onMousedown={ (e: MouseEvent) => {
                  if (e.target === inputRef.value) return

                  e.preventDefault()
                }}
                onClick:control={ onControlClick }
                onClick:clear={ onClear }
                onClick:prependInner={ attrs['onClick:prependInner'] }
                onClick:appendInner={ attrs['onClick:appendInner'] }
                role="textbox"
                { ...fieldProps }
                id={ id.value }
                active={ isActive.value || isDirty.value }
                dirty={ isDirty.value || props.dirty }
                focused={ isFocused.value }
                error={ isValid.value === false }
              >
                {{
                  ...slots,
                  default: ({
                    props: { class: fieldClass, ...slotProps },
                  }) => {
                    return (
                      <>
                        { props.prefix && (
                          <span class="v-text-field__prefix">
                            { props.prefix }
                          </span>
                        ) }

                        <div
                          class={ fieldClass }
                          onClick={ e => emit('click:input', e) }
                          data-no-activator=""
                        >
                          { slots.default?.() }

                          <input
                            ref={ inputRef }
                            value={ model.value }
                            onInput={ onInput }
                            v-intersect={[{
                              handler: onIntersect,
                            }, null, ['once']]}
                            autofocus={ props.autofocus }
                            readonly={ isReadonly.value }
                            disabled={ isDisabled.value }
                            name={ props.name }
                            placeholder={ props.placeholder }
                            size={ 1 }
                            type={ props.type }
                            onFocus={ onFocus }
                            onBlur={ () => (isFocused.value = false) }
                            { ...slotProps }
                            { ...inputAttrs }
                          />
                        </div>

                        { props.suffix && (
                          <span class="v-text-field__suffix">
                            { props.suffix }
                          </span>
                        ) }
                      </>
                    )
                  },
                }}
              </VField>
            ),
            details: hasDetails ? slotProps => (
              <>
                { slots.details?.(slotProps) }

                { hasCounter && (
                  <>
                    <span />

                    <VCounter
                      active={ props.persistentCounter || isFocused.value }
                      value={ counterValue.value }
                      max={ max.value }
                      v-slots={ slots.counter }
                    />
                  </>
                ) }
              </>
            ) : undefined,
          }}
        </VInput>
      )
    })

    return forwardRefs({}, vInputRef, vFieldRef, inputRef)
  },
})

export type VTextField = InstanceType<typeof VTextField>