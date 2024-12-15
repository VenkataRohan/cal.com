import { useEffect, useState } from "react";
import { z } from "zod";

import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import type getBookingResponsesSchema from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import { getBookingResponsesPartialSchema } from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import type { BookerEvent } from "@calcom/features/bookings/types";

export type useInitialFormValuesReturnType = ReturnType<typeof useInitialFormValues>;

type UseInitialFormValuesProps = {
  eventType?: Pick<BookerEvent, "bookingFields"> | null;
  rescheduleUid: string | null;
  isRescheduling: boolean;
  email?: string | null;
  name?: string | null;
  username?: string | null;
  hasSession: boolean;
  extraOptions: Record<string, string | string[]>;
  prefillFormParams: {
    guests: string[];
    name: string | null;
  };
  lastBookingResponse?: Record<string, string>;
};

export function useInitialFormValues({
  eventType,
  rescheduleUid,
  isRescheduling,
  email,
  name,
  username,
  hasSession,
  extraOptions,
  prefillFormParams,
  lastBookingResponse,
}: UseInitialFormValuesProps) {
  const [initialValues, setDefaultValues] = useState<{
    responses?: Partial<z.infer<ReturnType<typeof getBookingResponsesSchema>>>;
    bookingId?: number;
    responseArr?: any[];
  }>({});
  const bookingData = useBookerStore((state) => state.bookingData);
  const formValues = useBookerStore((state) => state.formValues);
  useEffect(() => {
    (async function () {
      if (Object.keys(formValues).length) {
        setDefaultValues(formValues);
        return;
      }
      if (!eventType?.bookingFields) {
        return {};
      }
      console.log("eventType.bookingFields");
      console.log(eventType.bookingFields);
      console.log(formValues);
      console.log(prefillFormParams);
      const querySchema = getBookingResponsesPartialSchema({
        bookingFields: eventType.bookingFields,
        view: rescheduleUid ? "reschedule" : "booking",
      });
      console.log("querySchema");
      console.log(querySchema);
      const parsedQuery = await querySchema.parseAsync({
        ...extraOptions,
        name: prefillFormParams.name,
        // `guest` because we need to support legacy URL with `guest` query param support
        // `guests` because the `name` of the corresponding bookingField is `guests`
        guests: prefillFormParams.guests,
      });
      console.log("parsedQuery");
      console.log(parsedQuery);

      const parsedLastBookingResponse = z.record(z.any()).nullish().parse(lastBookingResponse);

      const defaultUserValues = {
        email:
          rescheduleUid && bookingData && bookingData.attendees.length > 0
            ? bookingData?.attendees[0].email
            : !!parsedQuery["email"]
            ? parsedQuery["email"]
            : email ?? parsedLastBookingResponse?.email ?? "",
        name:
          rescheduleUid && bookingData && bookingData.attendees.length > 0
            ? bookingData?.attendees[0].name
            : !!parsedQuery["name"]
            ? parsedQuery["name"]
            : name ?? username ?? parsedLastBookingResponse?.name ?? "",
      };

      if (!isRescheduling) {
        const defaults = {
          responses: {} as Partial<z.infer<ReturnType<typeof getBookingResponsesSchema>>>,
          responseArr: [] as any,
        };
        // const obj = {}
        // eventType.bookingFields.forEach(field =>{
        //   obj[field.name] = parsedQuery[field.name]
        // })

        const responses = eventType.bookingFields.reduce((responses, field) => {
          defaults.responseArr.push(field.name);
          return {
            ...responses,
            [field.name]: parsedQuery[field.name] || undefined,
          };
        }, {});

        // const responsesMap = eventType.bookingFields.reduce((acc, field) => {
        //   acc.set(field.name, parsedQuery[field.name] || undefined);
        //   return acc;
        // }, new Map());

        // const responses = Object.fromEntries(responsesMap)
        // console.log(responsesMap);

        console.log("responses 1234");
        console.log(eventType.bookingFields);

        // console.log(Object.fromEntries(responsesMap));
        console.log(responses);

        // console.log('obj');
        // console.log(obj);

        defaults.responses = {
          ...responses,
          name: defaultUserValues.name,
          email: defaultUserValues.email ?? "",
        };

        setDefaultValues(defaults);
      }

      if (!rescheduleUid && !bookingData) {
        return {};
      }

      // We should allow current session user as default values for booking form

      const defaults = {
        responses: {} as Partial<z.infer<ReturnType<typeof getBookingResponsesSchema>>>,
        bookingId: bookingData?.id,
      };
      console.log("eventType.bookingFields");
      console.log(eventType.bookingFields);

      const responses = eventType.bookingFields.reduce((responses, field) => {
        return {
          ...responses,
          [field.name]: bookingData?.responses[field.name],
        };
      }, {});
      defaults.responses = {
        ...responses,
        name: defaultUserValues.name,
        email: defaultUserValues.email ?? "",
      };
      setDefaultValues(defaults);
    })();
    // do not add extraOptions as a dependency, it will cause infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    eventType?.bookingFields,
    formValues,
    isRescheduling,
    bookingData,
    bookingData?.id,
    rescheduleUid,
    email,
    name,
    username,
    prefillFormParams,
  ]);

  // When initialValues is available(after doing async schema parsing) or session is available(so that we can prefill logged-in user email and name), we need to reset the form with the initialValues
  // We also need the key to change if the bookingId changes, so that the form is reset and rerendered with the new initialValues
  const key = `${Object.keys(initialValues).length}_${hasSession ? 1 : 0}_${initialValues?.bookingId ?? 0}`;

  return { initialValues, key };
}
