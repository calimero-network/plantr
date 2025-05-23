import React, { ChangeEvent, FC, useEffect, useRef, useState } from 'react';
import { useClickOutside, useForm } from '../../../../hooks/index';
import {
  checkDateIsEqual,
  getDateTime,
  getDifferenceInTimeFromTwoTimes,
  getDifferenceOfTwoDates,
  shmoment,
} from '../../../../utils/date';
import { TSubmitHandler } from '../../../../hooks/useForm/types';
import { createEventSchema } from '../../../../validation-schemas/index';
import { IModalValues } from './types';
import { TPartialEvent } from '../../../../types/event';
import {
  TextField,
  DatePicker,
  ColorPicker,
} from '../../../../components/common/form-elements';
import cn from 'classnames';

import styles from './modal-form-event.module.scss';
import {
  getAppEndpointKey,
  getContextId,
  getExecutorPublicKey,
} from '@calimero-network/calimero-client';
import axios from 'axios';

interface IModalFormEventProps {
  textSendButton: string;
  textSendingBtn: string;
  defaultEventValues: IModalValues;
  closeModal: () => void;
  handlerSubmit: (eventData: TPartialEvent) => void;
}

const ModalFormEvent: FC<IModalFormEventProps> = ({
  textSendButton,
  textSendingBtn,
  closeModal,
  defaultEventValues,
  handlerSubmit,
}) => {
  const contextId = getContextId();
  const accountId = getExecutorPublicKey();
  const modalRef = useRef<HTMLDivElement>();
  const [viewOnly, setViewOnly] = useState(false);
  const { values, handleChange, handleSubmit, setValue, errors, submitting } =
    useForm<IModalValues>({
      defaultValues: defaultEventValues,
      rules: createEventSchema,
    });

  const isValid = Object.keys(errors).length === 0;

  const onSelectStartDate = (date: Date) => {
    if (values.isLongEvent) {
      const { minutes } = getDifferenceOfTwoDates(
        values.startDate,
        values.endDate,
      );
      const newEndDate = shmoment(date).add('minutes', minutes).result();

      setValue('endDate', newEndDate);
      setValue('startDate', date);
      return;
    }

    const oldStartDate = getDateTime(values.startDate, values.startTime);
    const newStartDate = getDateTime(date, values.startTime);
    const { minutes } = getDifferenceOfTwoDates(oldStartDate, values.endDate);
    const newEndDate = shmoment(newStartDate).add('minutes', minutes).result();

    setValue('endDate', newEndDate);
    setValue('startDate', newStartDate);
  };

  const onSelectEndDate = (date: Date) => {
    const endTime = values.isLongEvent ? '23:59' : values.endTime;
    setValue('endDate', getDateTime(date, endTime));
  };

  const onSelectStartTime = (time: string) => {
    const [startHours, startMins] = time.split(':');
    const { hours, minutes } = getDifferenceOfTwoDates(
      values.startDate,
      values.endDate,
    );
    const restHourFromDiff = +startMins + (minutes % 60) >= 60 ? 1 : 0;

    const newEndMins = ((+startMins + minutes) % 60)
      .toString()
      .padStart(2, '0');
    const newEndHours = (
      (+startHours + Math.floor(hours) + restHourFromDiff) %
      24
    )
      .toString()
      .padStart(2, '0');

    const newEndTime = `${newEndHours}:${newEndMins}`;
    const newEndDate = shmoment(getDateTime(values.startDate, time))
      .add('minutes', minutes)
      .result();

    setValue('startTime', time);
    setValue('endTime', newEndTime);

    setValue('endDate', newEndDate);
    setValue('startDate', getDateTime(values.startDate, time));
  };

  const onSelectEndTime = (time: string) => {
    const isDatesEqual = checkDateIsEqual(values.startDate, values.endDate);
    const { minutes } =
      isDatesEqual || !!errors.endDate
        ? getDifferenceInTimeFromTwoTimes(values.startTime, time)
        : getDifferenceOfTwoDates(
            values.startDate,
            getDateTime(values.endDate, time),
          );
    const newEndDate = shmoment(getDateTime(values.startDate, values.startTime))
      .add('minutes', minutes)
      .result();

    setValue('endTime', time);
    setValue('endDate', newEndDate);
  };

  const onChangeColor = (color: string) => setValue('color', color);

  const onToggleIsLongEvent = (e: ChangeEvent<HTMLInputElement>) => {
    const isLongEvent = e.target.checked;
    const startTime = isLongEvent ? '00:00' : values.startTime;
    const endTime = isLongEvent ? '23:59' : values.endTime;

    setValue('isLongEvent', isLongEvent);
    setValue('startDate', getDateTime(values.startDate, startTime));
    setValue('endDate', getDateTime(values.endDate, endTime));
  };

  const [error, setError] = useState<string | null>(null);

  const onSubmit: TSubmitHandler<IModalValues> = async (data) => {
    const newEvent: TPartialEvent = {
      title: data.title,
      description: data.description,
      peers: data.peers.toString(),
      start: data.startDate.toString(),
      end: data.endDate.toString(),
      type: data.isLongEvent ? 'long-event' : 'event',
      color: data.color,
    };

    try {
      // @ts-ignore
      let response = await handlerSubmit(newEvent).unwrap();
      closeModal();
    } catch (error: any) {
      setError(`JsonRPC error: ${error.message}`);
    }
  };

  // @ts-ignore
  useClickOutside(modalRef, closeModal);

  useEffect(() => {
    if (textSendButton === 'Edit') {
      if (accountId === defaultEventValues.owner) {
        setViewOnly(false);
      } else {
        setViewOnly(true);
      }
    }
  }, [
    accountId,
    defaultEventValues.owner,
    defaultEventValues.peers,
    textSendButton,
  ]);

  const [fetchedPeers, setFetchedPeers] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredPeers, setFilteredPeers] = useState<string[]>([]);

  useEffect(() => {
    const fetchPeers = async () => {
      try {
        const response = await axios.get(
          `${getAppEndpointKey()}/admin-api/contexts/${contextId}/identities`,
        );
        setFetchedPeers(response.data.data.identities);
      } catch (error) {
        console.error('Error fetching peers:', error);
        setFetchedPeers([]);
      }
    };
    fetchPeers();
  }, []);

  const handlePeersChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    handleChange(e);

    if (inputValue.includes('@')) {
      setShowDropdown(true);
      const query = inputValue.split('@').pop();
      setFilteredPeers(
        fetchedPeers.filter((peer) =>
          peer.toLowerCase().includes(query?.toLowerCase() || ''),
        ),
      );
    } else {
      setShowDropdown(false);
    }
  };

  const handlePeerSelect = (peer: string) => {
    const cleanedPeer = peer.replace('@', '');
    let oldValues = values.peers.replace('@', '');
    const currentPeers = oldValues
      ? oldValues.split(',').map((p) => p.trim())
      : [];

    if (!currentPeers.includes(cleanedPeer)) {
      const newPeers =
        currentPeers.length > 0
          ? `${oldValues.trim()}, ${cleanedPeer}`
          : cleanedPeer;
      setValue('peers', newPeers);
    }
    setShowDropdown(false);
  };

  return (
    <div className="overlay">
      {/* @ts-ignore */}
      <div className={styles.modal} ref={modalRef}>
        <div className={styles.modal__content}>
          <button className={styles.modal__content__close} onClick={closeModal}>
            <i className="fas fa-times"></i>
          </button>
          <form
            className={styles.modal__form}
            onSubmit={handleSubmit(onSubmit)}
          >
            <TextField
              type="text"
              name="title"
              placeholder="Title"
              onChange={handleChange}
              value={values.title}
              error={errors.title}
              className={styles.modal__form__title}
              fullWidth
              readOnly={viewOnly}
            />
            <div
              className={cn(
                styles.modal__form__date,
                styles.modal__form__group,
              )}
            >
              <DatePicker
                selectedDate={values.startDate}
                selectDate={onSelectStartDate}
                error={errors.startDate}
              />
              {!values.isLongEvent && (
                <div className={styles.modal__form__time}>
                  <input
                    type="time"
                    value={values.startTime}
                    onChange={(e) => onSelectStartTime(e.target.value)}
                    className={styles.modal__form__time__input}
                    readOnly={viewOnly}
                  />
                  <span>-</span>
                  <input
                    type="time"
                    value={values.endTime}
                    onChange={(e) => onSelectEndTime(e.target.value)}
                    className={styles.modal__form__time__input}
                    readOnly={viewOnly}
                    min={values.startTime}
                  />
                </div>
              )}
              {values.isLongEvent && (
                <div className={styles.modal__form__time__separator}>-</div>
              )}
              <div>
                <DatePicker
                  selectedDate={values.endDate}
                  selectDate={onSelectEndDate}
                  error={errors.endDate}
                />
              </div>
            </div>
            {(!!errors.startDate ||
              !!errors.endDate ||
              !!errors.startTime ||
              !!errors.endTime) && (
              <div className={styles.modal__form__error}>
                {errors.startDate ??
                  errors.endDate ??
                  errors.startTime ??
                  errors.endTime}
              </div>
            )}
            {!viewOnly && (
              <div
                className={cn(
                  styles.modal__form__checkbox__container,
                  styles.modal__form__group,
                )}
              >
                <label htmlFor="type">
                  <input
                    type="checkbox"
                    name="type"
                    id="type"
                    onChange={onToggleIsLongEvent}
                    checked={values.isLongEvent}
                    readOnly={viewOnly}
                  />
                  <span className={styles.modal__form__checkbox__title}>
                    All day
                  </span>
                </label>
              </div>
            )}
            {!viewOnly && (
              <div className={styles.modal__form__group}>
                <div className={styles.modal__form__group__title}>
                  Select event color
                </div>
                <ColorPicker
                  selectedColor={values.color}
                  onChangeColor={onChangeColor}
                  readOnly={viewOnly}
                />
              </div>
            )}
            <div className={styles.modal__form__group}>
              <div className={styles.modal__form__group__title}>
                Invite peers
              </div>
              <div className={styles.modal__form__group__peers}>
                <div className={styles.modal__form__group__peers__item}>
                  <input
                    name="peers"
                    onChange={handlePeersChange}
                    value={values.peers as string}
                    className={styles.modal__form__textarea}
                    type="text"
                    placeholder="peer1, peer2, peer3"
                    readOnly={viewOnly}
                  />
                  {showDropdown && (
                    <ul className={styles.dropdown}>
                      {filteredPeers.map((peer) => (
                        <li
                          key={peer}
                          onClick={() => handlePeerSelect(peer)}
                          className={styles.dropdown__item}
                        >
                          {peer}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <div
              className={cn(
                styles.modal__form__textarea__container,
                styles.modal__form__group,
              )}
            >
              <textarea
                name="description"
                placeholder="Description"
                className={styles.modal__form__textarea}
                onChange={handleChange}
                value={values.description}
                readOnly={viewOnly}
              />
            </div>
            {error && <div className={styles.modal__form__error}>{error}</div>}
            {!viewOnly && (
              <button
                type="submit"
                className={styles.modal__form__btn}
                disabled={submitting || !isValid}
              >
                {submitting ? textSendingBtn : textSendButton}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ModalFormEvent;
