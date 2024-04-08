import {
  query,
  update,
  text,
  Record,
  StableBTreeMap,
  Variant,
  Vec,
  Ok,
  Err,
  ic,
  Opt,
  None,
  Some,
  Principal,
  Duration,
  nat64,
  Result,
  Canister,
} from "azle";

import { v4 as uuidv4 } from "uuid";

const Operator = Record({
  name: text,
  principal: Principal,
  phoneNumber: text,
});

const Train = Record({
  id: text,
  operatorName: text,
  name: text,
  image: text,
  departureTime: text,
  arrivalTime: text,
  travelDuration: text,
  price: nat64,
  availableSeats: nat64,
  bookedSeats: nat64,
});

const TrainPayload = Record({
  name: text,
  operatorName: text,
  image: text,
  departureTime: text,
  arrivalTime: text,
  travelDuration: text,
  price: nat64,
  availableSeats: nat64,
});

const OperatorPayload = Record({
  name: text,
  phoneNumber: text,
});

const Ticket = Record({
  id: text,
  trainId: text,
  userId: text,
  numberOfSeats: nat64,
});

const TicketPayload = Record({
  trainId: text,
  userId: text,
  numberOfSeats: nat64,
});

const TicketInfo = Record({
  id: text,
  trainId: text,
  trainName: text,
  userId: text,
  userName: text,
  userPhoneNumber: text,
  departureTime: text,
  arrivalTime: text,
  travelDuration: text,
  price: nat64,
  numberOfSeats: nat64,
});

const User = Record({
  id: text,
  name: text,
  phoneNumber: text,
  email: text,
  tickets: Vec(text),
});

const UserPayload = Record({
  name: text,
  phoneNumber: text,
  email: text,
});

const CancelTicketPayload = Record({
  ticketId: text,
  userId: text,
});

const Message = Variant({
  NotFound: text,
  InvalidPayload: text,
  PaymentFailed: text,
  PaymentCompleted: text,
});

const trainsStorage = StableBTreeMap(0, text, Train);
const ticketsStorage = StableBTreeMap(1, text, Ticket);
const usersStorage = StableBTreeMap(2, text, User);
const operatorsStorage = StableBTreeMap(3, text, Operator);

export default Canister({
  addTrain: update([TrainPayload], Result(Train, Message), (payload) => {
    if (typeof payload !== "object" || Object.keys(payload).length === 0) {
      return Err({ NotFound: "invalid payload" });
    }

    const operatorOpt = operatorsStorage.get(payload.operatorName);
    if ("None" in operatorOpt) {
      return Err({
        InvalidPayload: `Operator with name ${payload.operatorName} not found`,
      });
    }

    const train: Train = {
      id: uuidv4(),
      operatorName: payload.operatorName,
      name: payload.name,
      image: payload.image,
      departureTime: payload.departureTime,
      arrivalTime: payload.arrivalTime,
      travelDuration: payload.travelDuration,
      price: payload.price,
      availableSeats: payload.availableSeats,
      bookedSeats: 0n,
    };

    trainsStorage.insert(train.id, train);
    return Ok(train);
  }),

  getTrain: query([text], Result(Train, Message), (trainId) => {
    const trainOpt = trainsStorage.get(trainId);
    if ("None" in trainOpt) {
      return Err({ NotFound: `Train with id ${trainId} not found` });
    }
    return Ok(trainOpt.Some);
  }),

  getTrains: query([], Vec(Train), () => {
    return trainsStorage.values();
  }),

  createTicket: update(
    [TicketPayload],
    Result(TicketInfo, Message),
    (payload) => {
      const userOpt = usersStorage.get(payload.userId);
      if ("None" in userOpt) {
        return Err({ NotFound: `User with id ${payload.userId} not found` });
      }

      const trainOpt = trainsStorage.get(payload.trainId);
      if ("None" in trainOpt) {
        return Err({ NotFound: `Train with id ${payload.trainId} not found` });
      }

      const train = trainOpt.Some;
      const user = userOpt.Some;
      const ticketId = uuidv4();
      const ticket: Ticket = {
        id: ticketId,
        userId: user.id,
        trainId: train.id,
        numberOfSeats: payload.numberOfSeats,
      };

      const ticketInfo: TicketInfo = {
        id: ticketId,
        trainId: train.id,
        trainName: train.name,
        userId: user.id,
        userName: user.name,
        userPhoneNumber: user.phoneNumber,
        departureTime: train.departureTime,
        arrivalTime: train.arrivalTime,
        travelDuration: train.travelDuration,
        price: train.price,
        numberOfSeats: payload.numberOfSeats,
      };

      const currentTime = new Date().getTime();
      const departureTime = new Date(train.departureTime).getTime();
      if (currentTime > departureTime) {
        return Err({
          InvalidPayload: `Train with id ${train.id} has already departed`,
        });
      }

      if (user.tickets.includes(ticketId)) {
        return Err({
          InvalidPayload: `User with id ${user.id} already booked a ticket for train ${train.id}`,
        });
      }

      if (train.availableSeats < payload.numberOfSeats) {
        return Err({
          InvalidPayload: `Insufficient seats available for train ${train.id}`,
        });
      }

      train.bookedSeats += payload.numberOfSeats;
      train.availableSeats -= payload.numberOfSeats;
      trainsStorage.insert(train.id, train);

      ticketsStorage.insert(ticket.id, ticket);
      user.tickets.push(ticket.id);
      usersStorage.insert(user.id, user);

      return Ok(ticketInfo);
    }
  ),

  getTickets: query([], Vec(Ticket), () => {
    return ticketsStorage.values();
  }),

  getTicketInfo: query([text], Result(TicketInfo, Message), (ticketId) => {
    const ticketOpt = ticketsStorage.get(ticketId);
    if ("None" in ticketOpt) {
      return Err({ NotFound: `Ticket with id ${ticketId} not found` });
    }
    const ticket = ticketOpt.Some;

    const trainOpt = trainsStorage.get(ticket.trainId);
    if ("None" in trainOpt) {
      return Err({ NotFound: `Train with id ${ticket.trainId} not found` });
    }
    const train = trainOpt.Some;

    const userOpt = usersStorage.get(ticket.userId);
    if ("None" in userOpt) {
      return Err({ NotFound: `User with id ${ticket.userId} not found` });
    }
    const user = userOpt.Some;

    const ticketInfo: TicketInfo = {
      id: ticket.id,
      trainId: train.id,
      trainName: train.name,
      userId: user.id,
      userName: user.name,
      userPhoneNumber: user.phoneNumber,
      departureTime: train.departureTime,
      arrivalTime: train.arrivalTime,
      travelDuration: train.travelDuration,
      price: train.price,
      numberOfSeats: ticket.numberOfSeats,
    };

    return Ok(ticketInfo);
  }),

  addUser: update([UserPayload], Result(User, Message), (payload) => {
    if (typeof payload !== "object" || Object.keys(payload).length === 0) {
      return Err({ NotFound: "invalid payload" });
    }

    const user: User = {
      id: uuidv4(),
      tickets: [],
      ...payload,
    };

    usersStorage.insert(user.id, user);
    return Ok(user);
  }),

  getUser: query([text], Opt(User), (userId) => {
    return usersStorage.get(userId);
  }),

  getUsers: query([], Vec(User), () => {
    return usersStorage.values();
  }),

  addOperator: update([OperatorPayload], Result(Operator, Message), (payload) => {
    const operator: Operator = {
      name: payload.name,
      principal: ic.caller(),
      phoneNumber: payload.phoneNumber,
    };

    operatorsStorage.insert(operator.name, operator);
    return Ok(operator);
  }),

  getOperator: query([text], Result(Operator, Message), (operatorName) => {
    const operatorOpt = operatorsStorage.get(operatorName);
    if ("None" in operatorOpt) {
      return Err({ NotFound: `Operator with name ${operatorName} not found` });
    }
    return Ok(operatorOpt.Some);
  }),

  getOperators: query([], Vec(Operator), () => {
    return operatorsStorage.values();
  }),

  cancelTicket: update(
    [CancelTicketPayload],
    Result(CancelTicketPayload, Message),
    (payload) => {
      const ticketOpt = ticketsStorage.get(payload.ticketId);
      if ("None" in ticketOpt) {
        return Err({ NotFound: `Ticket with id ${payload.ticketId} not found` });
      }
      const ticket = ticketOpt.Some;

      const userOpt = usersStorage.get(payload.userId);
      if ("None" in userOpt) {
        return Err({ NotFound: `User with id ${payload.userId} not found` });
      }
      const user = userOpt.Some;

      const trainOpt = trainsStorage.get(ticket.trainId);
      if ("None" in trainOpt) {
        return Err({ NotFound: `Train with id ${ticket.trainId} not found` });
      }
      const train = trainOpt.Some;

      train.bookedSeats -= ticket.numberOfSeats;
      train.availableSeats += ticket.numberOfSeats;
      trainsStorage.insert(train.id, train);

      user.tickets = user.tickets.filter((id) => id !== ticket.id);
      usersStorage.insert(user.id, user);

      ticketsStorage.remove(ticket.id);

      return Ok(payload);
    }
  ),
});

// a workaround to make uuid package work with Azle
globalThis.crypto = {
  // @ts-ignore
  getRandomValues: () => {
    let array = new Uint8Array(32);

    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }

    return array;
  },
};